import { prisma } from "../db/connection";

export const AppointmentRepository = {
  findByBarberId(barberId: string) {
    return prisma.appointment.findMany({
      where: { barberId },
      include: { service: { select: { durationMinutes: true } } },
    });
  },

  create(data: {
    id: string;
    barberId: string;
    serviceId: string;
    clientName: string;
    clientId?: string;
    startsAt: Date;
    endsAt?: Date;
  }) {
    return prisma.appointment.create({ data });
  },
};
