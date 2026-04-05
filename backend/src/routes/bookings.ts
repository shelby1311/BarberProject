import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../infra/db/connection";
import { AppointmentRepository } from "../infra/repositories/AppointmentRepository";
import { getAvailableSlots } from "../application/services/SchedulingService";
import { NoDiscount, OnlineBookingDiscount } from "../domain/pricing/DiscountStrategy";
import {
  AppError,
  BusinessRuleException,
  ConflictScheduleException,
  NotFoundException,
  UnauthorizedException,
  SlotTakenException,
} from "../shared/AppError";
import { authMiddleware, requireBarber, requireClient, AuthRequest } from "../shared/authMiddleware";
import { io } from "../server";

export const bookingRouter = Router();

const BookingSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  clientName: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
  startTime: z.coerce.date().refine((d) => d > new Date(), "Não é possível agendar no passado."),
  useOnlineDiscount: z.boolean().optional().default(false),
});

// POST /api/bookings — criar agendamento
bookingRouter.post("/", async (req, res, next) => {
  try {
    const parsed = BookingSchema.parse(req.body);
    const { barberId, serviceId, clientName, startTime, useOnlineDiscount } = parsed;

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (startTime < oneHourFromNow) {
      throw new BusinessRuleException(
        "Agendamentos devem ser feitos com pelo menos 1 hora de antecedência."
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: { services: true, workingHours: true, scheduleBlocks: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const service = barber.services.find((s) => s.id === serviceId);
    if (!service) throw new NotFoundException("Serviço");

    // Valida se o barbeiro trabalha nesse dia da semana
    const dayOfWeek = startTime.getDay();
    const workingDay = barber.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!workingDay) {
      throw new BusinessRuleException("O barbeiro não atende neste dia da semana.");
    }

    // Valida bloqueios (feriados/imprevistos)
    const dateStr = startTime.toISOString().split("T")[0];
    const isBlocked = barber.scheduleBlocks.some((b) => b.date === dateStr);
    if (isBlocked) {
      throw new BusinessRuleException("O barbeiro está indisponível nesta data.");
    }

    const existingBookings = await AppointmentRepository.findByBarberId(barberId);
    const available = getAvailableSlots(
      startTime,
      existingBookings,
      barber.workingHours,
      service.durationMinutes,
      barber.scheduleBlocks
    );
    const isAvailable = available.some((slot) => slot.getTime() === startTime.getTime());

    if (!isAvailable) {
      throw new SlotTakenException();
    }

    const strategy = useOnlineDiscount ? new OnlineBookingDiscount() : new NoDiscount();
    const finalPriceInCents = strategy.apply(service.priceInCents);

    // Tenta obter clientId do token (se logado)
    const token = req.headers.authorization?.split(" ")[1];
    let clientId: string | undefined;
    if (token) {
      try {
        const jwt = await import("jsonwebtoken");
        const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { clientId?: string };
        clientId = payload.clientId;
      } catch { /* anônimo */ }
    }

    // Verifica se cliente está bloqueado nesta barbearia
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (client?.isBlocked) {
        throw new BusinessRuleException("Você está bloqueado nesta barbearia devido a faltas repetidas. Entre em contato com o barbeiro.");
      }
    }

    const endsAt = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    const appointment = await AppointmentRepository.create({
      id: randomUUID(),
      barberId,
      serviceId,
      clientName,
      clientId,
      startsAt: startTime,
      endsAt,
    });

    // Acumula pontos de fidelidade (1 ponto por real gasto)
    if (clientId) {
      const pointsEarned = Math.floor(finalPriceInCents / 100);
      await prisma.client.update({
        where: { id: clientId },
        data: { points: { increment: pointsEarned } },
      });
    }

    console.log(`[BOOKING] Novo agendamento: ${clientName} com ${barber.name} às ${startTime.toISOString()} — Serviço: ${service.name} — R$ ${(finalPriceInCents / 100).toFixed(2)}`);

    // Notifica dashboard do barbeiro em tempo real
    io.to(`barber:${barberId}`).emit("booking:new", {
      appointmentId: appointment.id,
      clientName,
      serviceName: service.name,
      startsAt: startTime.toISOString(),
    });
    res.status(201).json({
      success: true,
      appointmentId: appointment.id,
      confirmedAt: startTime.toISOString(),
      finalPriceInCents,
      pixKey: "barberflow@pix.com.br",
      pixMessage: `Pagamento opcional via Pix: barberflow@pix.com.br — R$ ${(finalPriceInCents / 100).toFixed(2)}`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: err.issues[0].message });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

// GET /api/bookings/:barberId/slots
bookingRouter.get("/:barberId/slots", async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const serviceId = req.query.serviceId as string | undefined;

    const barber = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      include: { workingHours: true, scheduleBlocks: true, services: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const dateStr = (req.query.date as string) ?? date.toISOString().split("T")[0];
    // Bloqueio total do dia (sem startTime/endTime)
    const isDayBlocked = barber.scheduleBlocks.some((b) => b.date === dateStr && !b.startTime);
    if (isDayBlocked) return res.json([]);

    const service = serviceId ? barber.services.find((s) => s.id === serviceId) : null;
    const durationMinutes = service?.durationMinutes ?? 30;

    const bookings = await AppointmentRepository.findByBarberId(req.params.barberId);
    const slots = getAvailableSlots(date, bookings, barber.workingHours, durationMinutes, barber.scheduleBlocks);
    res.json(slots.map((s) => s.toISOString()));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel — cancelar agendamento (cliente ou barbeiro)
bookingRouter.patch("/:id/cancel", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { barber: true },
    });
    if (!appointment) throw new NotFoundException("Agendamento");

    const isBarber = req.role === "barber" && req.barberId === appointment.barberId;
    const isClient = req.role === "client" && req.clientId === appointment.clientId;
    if (!isBarber && !isClient) throw new UnauthorizedException("Você não tem permissão para cancelar este agendamento.");

    if (appointment.status === "cancelled") {
      throw new BusinessRuleException("Este agendamento já foi cancelado.");
    }
    if (appointment.status === "completed") {
      throw new BusinessRuleException("Não é possível cancelar um agendamento já finalizado.");
    }

    // Clientes precisam cancelar com pelo menos 2h de antecedência
    if (isClient) {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      if (appointment.startsAt < twoHoursFromNow) {
        throw new BusinessRuleException("Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.");
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: "cancelled" },
    });

    console.log(`[CANCEL] Agendamento ${req.params.id} cancelado por ${req.role}`);
    res.json({ success: true, appointment: updated });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

// PATCH /api/bookings/:id/status — barbeiro atualiza status
bookingRouter.patch("/:id/status", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
    }).parse(req.body);

    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) throw new NotFoundException("Agendamento");
    if (appointment.barberId !== req.barberId) throw new UnauthorizedException();

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Lógica de no-show: incrementa contador e bloqueia após 2 faltas
    if (status === "no_show" && appointment.clientId) {
      const client = await prisma.client.update({
        where: { id: appointment.clientId },
        data: { noShowCount: { increment: 1 } },
      });
      if (client.noShowCount >= 2) {
        await prisma.client.update({
          where: { id: appointment.clientId },
          data: { isBlocked: true },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.issues[0].message });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

// GET /api/bookings/me — histórico do cliente logado
bookingRouter.get("/me", authMiddleware, requireClient, async (req: AuthRequest, res, next) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { clientId: req.clientId },
      include: { service: true, barber: true, review: true },
      orderBy: { startsAt: "desc" },
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/review — cliente avalia após "completed"
bookingRouter.post("/:id/review", authMiddleware, requireClient, async (req: AuthRequest, res, next) => {
  try {
    const { rating, comment } = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional().default(""),
    }).parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { review: true },
    });
    if (!appointment) throw new NotFoundException("Agendamento");
    if (appointment.clientId !== req.clientId) throw new UnauthorizedException();
    if (appointment.status !== "completed") {
      throw new BusinessRuleException("Só é possível avaliar agendamentos finalizados.");
    }
    if (appointment.review) {
      throw new BusinessRuleException("Este agendamento já foi avaliado.");
    }

    const review = await prisma.review.create({
      data: {
        id: randomUUID(),
        appointmentId: appointment.id,
        barberId: appointment.barberId,
        clientId: req.clientId!,
        rating,
        comment,
      },
    });
    res.status(201).json(review);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.issues[0].message });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

// GET /api/bookings/barber/:barberId/reviews — reviews públicas de um barbeiro
bookingRouter.get("/barber/:barberId/reviews", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { barberId: req.params.barberId },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;
    res.json({ reviews, averageRating: avg, total: reviews.length });
  } catch (err) {
    next(err);
  }
});
