import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infra/db/connection";
import { authMiddleware, requireBarber, AuthRequest } from "../shared/authMiddleware";
import { NotFoundException } from "../shared/AppError";

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
        reviews: true,
      },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = barber.appointments.filter((a) => a.status === "completed");
    const monthlyRevenue = completed
      .filter((a) => new Date(a.startsAt) >= startOfMonth)
      .reduce((sum, a) => sum + (a.service?.priceInCents ?? 0), 0);

    const serviceCounts: Record<string, { name: string; count: number }> = {};
    completed.forEach((a) => {
      if (!a.service) return;
      if (!serviceCounts[a.serviceId]) serviceCounts[a.serviceId] = { name: a.service.name, count: 0 };
      serviceCounts[a.serviceId].count++;
    });
    const topServices = Object.values(serviceCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    const avgRating = barber.reviews.length
      ? barber.reviews.reduce((s, r) => s + r.rating, 0) / barber.reviews.length
      : null;

    res.json({
      ...barber,
      appointments: barber.appointments.map((a) => ({
        ...a,
        clientPhone: a.client?.phone ?? null,
      })),
      metrics: {
        monthlyRevenueInCents: monthlyRevenue,
        totalCompleted: completed.length,
        topServices,
        averageRating: avgRating,
        totalReviews: barber.reviews.length,
      },
    });
  } catch (err) { next(err); }
});

// Listagem pública com busca por localização e filtros
barberRouter.get("/", async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const serviceType = req.query.service as string | undefined;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;

    const barbers = await prisma.barber.findMany({
      where: search ? { location: { contains: search } } : undefined,
      include: { ...include, reviews: true },
    });

    let result = barbers;
    if (serviceType) {
      result = result.filter((b) =>
        b.services.some((s) => s.name.toLowerCase().includes(serviceType.toLowerCase()))
      );
    }
    if (minRating !== undefined) {
      result = result.filter((b) => {
        if (!b.reviews.length) return false;
        const avg = b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length;
        return avg >= minRating;
      });
    }

    res.json(result.map((b) => ({
      ...b,
      averageRating: b.reviews.length
        ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length
        : null,
      totalReviews: b.reviews.length,
    })));
  } catch (err) { next(err); }
});

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
        `"${a.clientName}"`,
        `"${a.service?.name ?? ""}"`,
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
