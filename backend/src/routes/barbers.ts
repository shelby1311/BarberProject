import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infra/db/connection";
import { authMiddleware, requireBarber, AuthRequest } from "../shared/authMiddleware";
import { NotFoundException, BusinessRuleException, UnauthorizedException } from "../shared/AppError";
import { sanitizeCSVField } from "../shared/crypto";
import { io } from "../loaders/socket";
import { getPlanLimits, QUEUE_LIMITS } from "../shared/planGuard";

export const barberRouter = Router();

const include = { services: true, gallery: true, workingHours: true };

// Dashboard — dados do barbeiro logado com métricas
barberRouter.get("/me/dashboard", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: {
        services: true, gallery: true, workingHours: true, scheduleBlocks: true,
        appointments: { include: { service: true, client: { select: { phone: true } } }, orderBy: { startsAt: "asc" } },
      },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [topServicesRaw, ratingAgg, completedCount] = await Promise.all([
      prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { barberId: req.barberId, status: "completed" },
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: "desc" } },
        take: 5,
      }),
      prisma.review.aggregate({
        where: { barberId: req.barberId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.appointment.count({ where: { barberId: req.barberId, status: "completed" } }),
    ]);

    // Receita mensal: soma via join raw (Prisma não suporta _sum em campo de relação)
    const revenueAgg = await prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COALESCE(SUM(s.price_in_cents), 0) AS total
      FROM appointments a JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = ${req.barberId} AND a.status = 'completed'
        AND a.starts_at >= ${startOfMonth.toISOString()}
    `;
    const monthlyRevenue = Number(revenueAgg[0]?.total ?? 0);

    const serviceIds = topServicesRaw.map((r) => r.serviceId);
    const serviceNames = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(serviceNames.map((s) => [s.id, s.name]));
    const topServices = topServicesRaw.map((r) => ({ name: nameMap[r.serviceId] ?? r.serviceId, count: r._count.serviceId }));

    const avgRating = ratingAgg._avg.rating;
    const totalReviews = ratingAgg._count.rating;

    res.json({
      ...barber,
      appointments: barber.appointments.map((a) => ({ ...a, clientPhone: a.client?.phone ?? null })),
      metrics: {
        monthlyRevenueInCents: monthlyRevenue,
        totalCompleted: completedCount,
        topServices,
        averageRating: avgRating,
        totalReviews,
      },
    });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /api/barbers:
 *   get:
 *     summary: Listar barbeiros públicos
 *     tags: [Barbers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: service
 *         schema: { type: string }
 *       - in: query
 *         name: minRating
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Lista de barbeiros
 */
// Listagem pública com busca por localização e filtros
barberRouter.get("/", async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const serviceType = req.query.service as string | undefined;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;

    // Pré-filtra barbeiros com rating mínimo via groupBy no banco
    let barberIdsByRating: string[] | undefined;
    if (minRating !== undefined) {
      const groups = await prisma.review.groupBy({
        by: ["barberId"],
        _avg: { rating: true },
        having: { rating: { _avg: { gte: minRating } } },
      });
      barberIdsByRating = groups.map((g) => g.barberId);
    }

    const where: Record<string, unknown> = {
      ...(search ? { location: { contains: search } } : {}),
      ...(serviceType ? { services: { some: { name: { contains: serviceType } } } } : {}),
      ...(barberIdsByRating ? { id: { in: barberIdsByRating } } : {}),
    };

    const barbers = await prisma.barber.findMany({ where, include });

    // Busca médias via aggregate para não trazer todos os reviews
    const ratingAggs = await prisma.review.groupBy({
      by: ["barberId"],
      where: { barberId: { in: barbers.map((b) => b.id) } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const ratingMap = Object.fromEntries(ratingAggs.map((r) => [r.barberId, r]));

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json(barbers.map((b) => ({
      ...b,
      averageRating: ratingMap[b.id]?._avg.rating ?? null,
      totalReviews: ratingMap[b.id]?._count.rating ?? 0,
    })));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /api/barbers/{slug}:
 *   get:
 *     summary: Perfil público do barbeiro
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dados do barbeiro
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
// Perfil público por slug
barberRouter.get("/:slug", async (req, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { slug: req.params.slug },
      include: { services: true, gallery: true, workingHours: true, reviews: { include: { client: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!barber) throw new NotFoundException("Barbeiro");
    const avgRating = barber.reviews.length
      ? barber.reviews.reduce((s, r) => s + r.rating, 0) / barber.reviews.length
      : null;
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json({ ...barber, averageRating: avgRating, totalReviews: barber.reviews.length });
  } catch (err) { next(err); }
});

// Atualizar perfil
const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  phone: z.string().optional(),
});

barberRouter.put("/me/profile", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const data = UpdateSchema.parse(req.body);
    const barber = await prisma.barber.update({ where: { id: req.barberId }, data });
    res.json(barber);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Adicionar serviço
barberRouter.post("/me/services", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { name, priceInCents, durationMinutes } = z.object({
      name: z.string().min(1),
      priceInCents: z.number().int().positive(),
      durationMinutes: z.number().int().positive(),
    }).parse(req.body);

    const service = await prisma.service.create({
      data: { name, priceInCents, durationMinutes, barberId: req.barberId! },
    });
    res.status(201).json(service);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Remover serviço
barberRouter.delete("/me/services/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    await prisma.service.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Adicionar imagem à galeria
barberRouter.post("/me/gallery", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { url, caption } = z.object({
      url: z.string().url(),
      caption: z.string().optional().default(""),
    }).parse(req.body);

    const image = await prisma.galleryImage.create({
      data: { url, caption, barberId: req.barberId! },
    });
    res.status(201).json(image);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Remover imagem da galeria
barberRouter.delete("/me/gallery/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    await prisma.galleryImage.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Bloqueios de agenda (feriados/imprevistos/almoço)
barberRouter.get("/me/blocks", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const blocks = await prisma.scheduleBlock.findMany({ where: { barberId: req.barberId } });
    res.json(blocks);
  } catch (err) { next(err); }
});

barberRouter.post("/me/blocks", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { date, reason, startTime, endTime } = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)."),
      reason: z.string().optional().default(""),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // bloqueio parcial
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }).parse(req.body);
    const block = await prisma.scheduleBlock.create({
      data: { barberId: req.barberId!, date, reason, startTime, endTime },
    });
    res.status(201).json(block);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

barberRouter.delete("/me/blocks/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    await prisma.scheduleBlock.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});
// Métricas de ocupação — GET /api/barbers/me/occupancy?date=YYYY-MM-DD
barberRouter.get("/me/occupancy", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const dateStr = (req.query.date as string) ?? new Date().toISOString().split("T")[0];
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { workingHours: true, appointments: { where: { status: { notIn: ["cancelled", "no_show"] } } } },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const wh = barber.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!wh) return res.json({ occupancyRate: 0, totalSlots: 0, bookedSlots: 0 });

    const [sh, sm] = wh.startTime.split(":").map(Number);
    const [eh, em] = wh.endTime.split(":").map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const totalSlots = Math.floor(totalMinutes / 30);

    const bookedSlots = barber.appointments.filter((a) => {
      const d = new Date(a.startsAt);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0] === dateStr;
    }).length;

    res.json({
      date: dateStr,
      totalSlots,
      bookedSlots,
      occupancyRate: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0,
    });
  } catch (err) { next(err); }
});

// Exportar agenda em CSV — GET /api/barbers/me/export?month=2025-01
barberRouter.get("/me/export", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const barber = await prisma.barber.findUnique({ where: { id: req.barberId } });
    const commissionPct = barber?.commissionPct ?? 50;

    const appointments = await prisma.appointment.findMany({
      where: { barberId: req.barberId, startsAt: { gte: from, lte: to } },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    });

    const header = "Data,Hora,Cliente,Serviço,Duração(min),Preço(R$),Comissão(R$),Status";
    const rows = appointments.map((a) => {
      const d = new Date(a.startsAt);
      const price = a.service?.priceInCents ?? 0;
      const commission = ((price * commissionPct) / 100 / 100).toFixed(2);
      return [
        d.toLocaleDateString("pt-BR"),
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        `"${sanitizeCSVField(a.clientName)}"`,
        `"${sanitizeCSVField(a.service?.name ?? "")}"`,
        a.service?.durationMinutes ?? "",
        price ? (price / 100).toFixed(2) : "",
        commission,
        a.status,
      ].join(",");
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="agenda-${month}.csv"`);
    res.send([header, ...rows].join("\n"));
  } catch (err) { next(err); }
});

// Despesas — CRUD
barberRouter.get("/me/expenses", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { month } = req.query as { month?: string };
    const where: Record<string, unknown> = { barberId: req.barberId };
    if (month) where.date = { startsWith: month };
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
    res.json(expenses);
  } catch (err) { next(err); }
});

barberRouter.post("/me/expenses", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { description, amountInCents, date } = z.object({
      description: z.string().min(1),
      amountInCents: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(req.body);
    const expense = await prisma.expense.create({
      data: { id: require("crypto").randomUUID(), barberId: req.barberId!, description, amountInCents, date },
    });
    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

barberRouter.delete("/me/expenses/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    await prisma.expense.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Métricas mensais dos últimos 6 meses — GET /api/barbers/me/monthly-metrics
barberRouter.get("/me/monthly-metrics", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const months: { label: string; revenue: number; expenses: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      const [revenueRaw, expensesAgg] = await Promise.all([
        prisma.$queryRaw<[{ total: bigint }]>`
          SELECT COALESCE(SUM(s.price_in_cents), 0) AS total
          FROM appointments a JOIN services s ON a.service_id = s.id
          WHERE a.barber_id = ${req.barberId} AND a.status = 'completed'
            AND a.starts_at >= ${from.toISOString()} AND a.starts_at <= ${to.toISOString()}
        `,
        prisma.expense.aggregate({
          where: { barberId: req.barberId!, date: { startsWith: monthStr } },
          _sum: { amountInCents: true },
        }),
      ]);

      months.push({
        label,
        revenue: Number(revenueRaw[0]?.total ?? 0),
        expenses: expensesAgg._sum.amountInCents ?? 0,
      });
    }

    res.json(months);
  } catch (err) { next(err); }
});

// Clientes bloqueados — lista e desbloqueia
barberRouter.get("/me/blocked-clients", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { isBlocked: true, appointments: { some: { barberId: req.barberId } } },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(clients.map((c) => ({ id: c.id, name: c.user.name, email: c.user.email, noShowCount: c.noShowCount })));
  } catch (err) { next(err); }
});

barberRouter.patch("/me/clients/:clientId/unblock", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    // Verifica se o cliente tem agendamento com este barbeiro
    const appt = await prisma.appointment.findFirst({ where: { barberId: req.barberId, clientId: req.params.clientId } });
    if (!appt) return res.status(403).json({ message: "Cliente não pertence a este barbeiro." });
    await prisma.client.update({ where: { id: req.params.clientId }, data: { isBlocked: false, noShowCount: 0 } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Status do Barbeiro ────────────────────────────────────────────────

const StatusSchema = z.object({
  status: z.enum(["AVAILABLE", "BUSY", "BREAK", "OFFLINE"]),
});

/**
 * PATCH /api/barbers/me/status
 * Atualiza o status do barbeiro e emite evento via Socket.IO.
 */
barberRouter.patch("/me/status", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { status } = StatusSchema.parse(req.body);

    const barber = await prisma.barber.update({
      where: { id: req.barberId },
      data: { status },
      include: { barbershop: true },
    });

    // Emite evento de mudança de status para a sala da barbearia
    io.to(`barbershop:${barber.barbershopId}`).emit("STATUS_CHANGE", {
      barberId: barber.id,
      barberName: barber.name,
      status: barber.status,
    });

    res.json({ success: true, status: barber.status });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// ─── Fila de Espera ────────────────────────────────────────────────────

/**
 * POST /api/barbers/me/queue/add
 * Incrementa a fila de espera do barbeiro (cliente presencial).
 * Respeita o limite de fila do plano da barbearia.
 */
barberRouter.post("/me/queue/add", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { barbershop: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const { maxQueue } = await getPlanLimits(barber.barbershopId);

    if (barber.queueCount >= maxQueue) {
      throw new BusinessRuleException(
        `Limite de ${maxQueue} cliente(s) na fila atingido para o plano ${barber.barbershop.plan}. Faça upgrade para aumentar o limite.`
      );
    }

    const updated = await prisma.barber.update({
      where: { id: req.barberId },
      data: { queueCount: { increment: 1 } },
    });

    // Emite atualização da fila para a sala da barbearia
    io.to(`barbershop:${barber.barbershopId}`).emit("QUEUE_UPDATE", {
      barberId: updated.id,
      queueCount: updated.queueCount,
    });

    res.json({ success: true, queueCount: updated.queueCount });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/barbers/me/queue/remove
 * Decrementa a fila de espera do barbeiro (cliente presencial foi atendido/desistiu).
 */
barberRouter.post("/me/queue/remove", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { barbershop: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    if (barber.queueCount <= 0) {
      throw new BusinessRuleException("Fila já está vazia.");
    }

    const updated = await prisma.barber.update({
      where: { id: req.barberId },
      data: { queueCount: { decrement: 1 } },
    });

    // Emite atualização da fila para a sala da barbearia
    io.to(`barbershop:${barber.barbershopId}`).emit("QUEUE_UPDATE", {
      barberId: updated.id,
      queueCount: updated.queueCount,
    });

    res.json({ success: true, queueCount: updated.queueCount });
  } catch (err) {
    next(err);
  }
});

// GET /me/appointments/:id — detalhes do agendamento com info do cliente (para slide-over)
barberRouter.get("/me/appointments/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        client: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!appointment) throw new NotFoundException("Agendamento");
    if (appointment.barberId !== req.barberId) throw new UnauthorizedException();

    // Conta quantos agendamentos este cliente já teve com este barbeiro
    const totalAppointments = appointment.clientId
      ? await prisma.appointment.count({
          where: { clientId: appointment.clientId, barberId: req.barberId, status: { not: "cancelled" } },
        })
      : 0;

    res.json({
      ...appointment,
      clientHistory: {
        totalAppointments,
        noShowCount: appointment.client?.noShowCount ?? 0,
        isBlocked: appointment.client?.isBlocked ?? false,
        isRecurring: totalAppointments >= 3,
      },
    });
  } catch (err) { next(err); }
});

// POST /me/appointments/batch-confirm — confirma múltiplos agendamentos de uma vez
barberRouter.post("/me/appointments/batch-confirm", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string().min(1)).min(1).max(50) }).parse(req.body);

    const result = await prisma.appointment.updateMany({
      where: { id: { in: ids }, barberId: req.barberId, status: "pending" },
      data: { status: "confirmed" },
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// POST /me/appointments/cleanup-cancelled — remove (ou marca como lido) cancelados antigos
barberRouter.post("/me/appointments/cleanup-cancelled", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.appointment.deleteMany({
      where: {
        barberId: req.barberId,
        status: "cancelled",
        startsAt: { lt: thirtyDaysAgo },
      },
    });

    res.json({ success: true, deletedCount: result.count });
  } catch (err) { next(err); }
});

const WorkingHoursSchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}));

barberRouter.put("/me/working-hours", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const hours = WorkingHoursSchema.parse(req.body);
    // Upsert cada dia
    await prisma.$transaction(
      hours.map((h) =>
        prisma.workingHours.upsert({
          where: { barberId_dayOfWeek: { barberId: req.barberId!, dayOfWeek: h.dayOfWeek } },
          update: { startTime: h.startTime, endTime: h.endTime },
          create: { barberId: req.barberId!, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime },
        })
      )
    );
    // Remove dias que não vieram no payload
    const days = hours.map((h) => h.dayOfWeek);
    await prisma.workingHours.deleteMany({ where: { barberId: req.barberId!, dayOfWeek: { notIn: days } } });
    const updated = await prisma.workingHours.findMany({ where: { barberId: req.barberId! } });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// ─── FIDELIDADE ────────────────────────────────────────────────────────────────

// GET /me/loyalty/rewards — lista recompensas
barberRouter.get("/me/loyalty/rewards", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({ where: { id: req.barberId }, select: { barbershopId: true } });
    if (!barber) throw new NotFoundException("Barbeiro");
    // Recompensas são globais da barbearia — armazenamos como JSON no barbershop ou simplesmente fixas
    // Por simplicidade, retornamos recompensas padrão + customizadas
    const rewards = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, description, points_cost as pointsCost, active FROM loyalty_rewards WHERE barbershop_id = ?`,
      barber.barbershopId
    ).catch(() => []);
    res.json(rewards);
  } catch (err) { next(err); }
});

// POST /me/loyalty/rewards — cria recompensa
barberRouter.post("/me/loyalty/rewards", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { name, description, pointsCost } = z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      pointsCost: z.number().int().positive(),
    }).parse(req.body);
    const barber = await prisma.barber.findUnique({ where: { id: req.barberId }, select: { barbershopId: true } });
    if (!barber) throw new NotFoundException("Barbeiro");
    await prisma.$executeRawUnsafe(
      `INSERT INTO loyalty_rewards (id, barbershop_id, name, description, points_cost, active) VALUES (?, ?, ?, ?, ?, 1)`,
      require("crypto").randomUUID(), barber.barbershopId, name, description, pointsCost
    );
    res.json({ id: "", name, description, pointsCost, active: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// DELETE /me/loyalty/rewards/:id
barberRouter.delete("/me/loyalty/rewards/:id", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM loyalty_rewards WHERE id = ?`, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /me/appointments/:id/checkin — QR Code Check-in
barberRouter.patch("/me/appointments/:id/checkin", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, barberId: req.barberId, status: "confirmed" },
      include: { client: true },
    });
    if (!appointment) throw new NotFoundException("Agendamento não encontrado ou não está confirmado");

    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: "completed" },
    });

    // Se tem cliente, acumula pontos de fidelidade
    if (appointment.clientId && !appointment.pointsAwarded) {
      const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
      const points = Math.floor((service?.priceInCents ?? 0) / 100); // 1 ponto a cada R$1
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: { points: { increment: points } },
      });
      await prisma.appointment.update({
        where: { id: req.params.id },
        data: { pointsAwarded: true },
      });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── GRADE SEMANAL ────────────────────────────────────────────────────────────

// GET /me/weekly-schedule?weekStart=2025-06-16
barberRouter.get("/me/weekly-schedule", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const weekStart = req.query.weekStart as string;
    if (!weekStart) throw new Error("weekStart é obrigatório (YYYY-MM-DD)");

    const startDate = new Date(weekStart + "T00:00:00");
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: {
        workingHours: true,
        scheduleBlocks: true,
        appointments: {
          where: { startsAt: { gte: startDate, lt: endDate } },
          include: { service: { select: { name: true, durationMinutes: true } }, client: { select: { user: { select: { name: true } } } } },
          orderBy: { startsAt: "asc" },
        },
      },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const days: WeeklySlot[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();

      const wh = barber.workingHours.find((h) => h.dayOfWeek === dayOfWeek);
      const blocks = barber.scheduleBlocks.filter((b) => b.date === dateStr);
      const dayAppointments = barber.appointments.filter(
        (a) => a.startsAt.toISOString().split("T")[0] === dateStr
      );

      const slots: WeeklySlot["slots"] = [];
      if (wh) {
        const [startH, startM] = wh.startTime.split(":").map(Number);
        const [endH, endM] = wh.endTime.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        for (let m = startMin; m < endMin; m += 30) {
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          const time = `${hh}:${mm}`;
          const slotDateTime = new Date(`${dateStr}T${time}:00`);
          const now = new Date();

          // Verificar se está bloqueado
          const isBlocked = blocks.some((b) => {
            if (!b.startTime || !b.endTime) return true; // dia inteiro
            return time >= b.startTime && time < b.endTime;
          });

          // Verificar se tem agendamento
          const booked = dayAppointments.find((a) => {
            const aTime = a.startsAt.toISOString().split("T")[1].slice(0, 5);
            return aTime === time;
          });

          if (booked) {
            slots.push({
              time,
              status: slotDateTime < now ? "past" : "booked",
              appointmentId: booked.id,
              clientName: booked.client?.user?.name ?? booked.clientName,
              serviceName: booked.service?.name,
            });
          } else if (isBlocked) {
            slots.push({ time, status: "blocked" });
          } else if (slotDateTime < now) {
            slots.push({ time, status: "past" });
          } else {
            slots.push({ time, status: "available" });
          }
        }
      }

      days.push({ date: dateStr, dayOfWeek, slots });
    }

    res.json(days);
  } catch (err) { next(err); }
});

interface WeeklySlot {
  date: string;
  dayOfWeek: number;
  slots: { time: string; status: string; appointmentId?: string; clientName?: string; serviceName?: string }[];
}

// ─── CRM CLIENTES ────────────────────────────────────────────────────────────

// GET /me/clients — lista todos os clientes com perfil completo
barberRouter.get("/me/clients", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { barberId: req.barberId, clientId: { not: null } },
      include: {
        client: {
          include: { user: { select: { name: true, email: true } } },
        },
        service: { select: { priceInCents: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    // Agrupar por clientId
    const clientMap = new Map<string, ClientProfileData>();
    for (const a of appointments) {
      if (!a.clientId || !a.client) continue;
      const existing = clientMap.get(a.clientId);
      if (existing) {
        existing.totalAppointments++;
        existing.totalSpentInCents += a.service?.priceInCents ?? 0;
        if (!existing.lastVisit || a.startsAt > new Date(existing.lastVisit)) {
          existing.lastVisit = a.startsAt.toISOString();
        }
      } else {
        clientMap.set(a.clientId, {
          id: a.clientId,
          name: a.client.user.name,
          email: a.client.user.email,
          phone: a.client.phone,
          points: a.client.points,
          noShowCount: a.client.noShowCount,
          isBlocked: a.client.isBlocked,
          totalAppointments: 1,
          totalSpentInCents: a.service?.priceInCents ?? 0,
          lastVisit: a.startsAt.toISOString(),
        });
      }
    }

    const clients = Array.from(clientMap.values()).map((c) => ({
      ...c,
      tags: [] as string[],
    }));

    // Adicionar tags
    for (const c of clients) {
      if (c.totalAppointments >= 10) c.tags.push("VIP");
      if (c.totalAppointments >= 3) c.tags.push("Recorrente");
      if (c.noShowCount >= 2) c.tags.push("Risco");
      if (c.isBlocked) c.tags.push("Bloqueado");
      if (c.totalSpentInCents >= 50000) c.tags.push("Alto Gasto"); // R$500+
    }

    res.json(clients);
  } catch (err) { next(err); }
});

interface ClientProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  noShowCount: number;
  isBlocked: boolean;
  totalAppointments: number;
  totalSpentInCents: number;
  lastVisit: string;
}
