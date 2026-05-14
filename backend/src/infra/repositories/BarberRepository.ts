import { prisma } from "../db/connection";

const include = { services: true };

export const BarberRepository = {
  findAll() {
    return prisma.barber.findMany({ include });
  },

  findBySlug(slug: string) {
    return prisma.barber.findUnique({ where: { slug }, include });
  },

  findById(id: string) {
    return prisma.barber.findUnique({ where: { id }, include });
  },
};
