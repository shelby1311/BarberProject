import { prisma } from "../db/connection";

export const AppointmentRepository = {
  findByBarberId(barberId: string) {
    return prisma.appointment.findMany({ where: { barberId } });
  },

  create(data: {
    id: string;
    barberId: string;
    serviceId: string;
    clientName: string;
    startsAt: Date;
  }) {
    return prisma.appointment.create({ data });
  },
};
