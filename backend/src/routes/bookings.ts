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
} from "../shared/AppError";

export const bookingRouter = Router();

const BookingSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  clientName: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
  startTime: z.coerce.date().refine((d) => d > new Date(), "Não é possível agendar no passado."),
  useOnlineDiscount: z.boolean().optional().default(false),
});

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
      include: { services: true, workingHours: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const service = barber.services.find((s) => s.id === serviceId);
    if (!service) throw new NotFoundException("Serviço");

    const existingBookings = await AppointmentRepository.findByBarberId(barberId);
    const available = getAvailableSlots(startTime, existingBookings, barber.workingHours);
    const isAvailable = available.some((slot) => slot.getTime() === startTime.getTime());

    if (!isAvailable) {
      const time = startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      throw new ConflictScheduleException(time);
    }

    const strategy = useOnlineDiscount ? new OnlineBookingDiscount() : new NoDiscount();
    const finalPriceInCents = strategy.apply(service.priceInCents);

    const appointment = await AppointmentRepository.create({
      id: randomUUID(),
      barberId,
      serviceId,
      clientName,
      startsAt: startTime,
    });

    res.status(201).json({
      success: true,
      appointmentId: appointment.id,
      confirmedAt: startTime.toISOString(),
      finalPriceInCents,
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

bookingRouter.get("/:barberId/slots", async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const barber = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      include: { workingHours: true },
    });
    const bookings = await AppointmentRepository.findByBarberId(req.params.barberId);
    const slots = getAvailableSlots(date, bookings, barber?.workingHours);
    res.json(slots.map((s) => s.toISOString()));
  } catch (err) {
    next(err);
  }
});
