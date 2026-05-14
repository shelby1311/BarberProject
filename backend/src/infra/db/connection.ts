import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasources: process.env.DATABASE_URL
    ? { db: { url: process.env.DATABASE_URL } }
    : undefined,
});
