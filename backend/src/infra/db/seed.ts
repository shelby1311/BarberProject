import { prisma } from "./connection";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("barber123", 10);

  // ─── Barbearia 1: João Silva (SP) ──────────────────────────────────────
  const user1 = await prisma.user.upsert({
    where: { cpf: "52998224725" },
    update: {},
    create: {
      cpf: "52998224725",
      email: "joao@barberflow.com",
      name: "João Silva",
      passwordHash: hash,
      role: "barber",
    },
  });

  // Cria a barbearia com ownerId = user1.id
  const shop1 = await prisma.barbershop.upsert({
    where: { slug: "barbearia-joao-silva" },
    update: {},
    create: {
      ownerId: user1.id,
      name: "Barbearia do João",
      slug: "barbearia-joao-silva",
      plan: "PRO",
      maxBarbers: 5,
      planStatus: "ACTIVE",
    },
  });

  // Cria o barbeiro vinculado à barbearia
  const barber1 = await prisma.barber.upsert({
    where: { slug: "joao-silva" },
    update: {},
    create: {
      userId: user1.id,
      barbershopId: shop1.id,
      name: "João Silva",
      location: "São Paulo, SP",
      slug: "joao-silva",
      bio: "Especialista em degradê e barba. 10 anos de experiência no mercado.",
      coverUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      instagram: "@joaosilva.barber",
      acceptedPayments: JSON.stringify(["pix", "credit", "debit", "cash"]),
      services: {
        create: [
          { name: "Corte Degradê",  priceInCents: 4500, durationMinutes: 40 },
          { name: "Barba Completa", priceInCents: 3000, durationMinutes: 40 },
          { name: "Corte + Barba",  priceInCents: 7000, durationMinutes: 80 },
        ],
      },
    },
  });

  // Garante os horários de funcionamento (upsert não cria aninhados no update)
  await prisma.workingHours.deleteMany({ where: { barberId: barber1.id } });
  await prisma.workingHours.createMany({
    data: [
      { barberId: barber1.id, dayOfWeek: 1, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber1.id, dayOfWeek: 2, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber1.id, dayOfWeek: 3, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber1.id, dayOfWeek: 4, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber1.id, dayOfWeek: 5, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber1.id, dayOfWeek: 6, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
    ],
  });

  // ─── Barbearia 2: Carlos Mendes (RJ) ────────────────────────────────────
  const user2 = await prisma.user.upsert({
    where: { cpf: "87748248800" },
    update: {},
    create: {
      cpf: "87748248800",
      email: "carlos@barberflow.com",
      name: "Carlos Mendes",
      passwordHash: hash,
      role: "barber",
    },
  });

  const shop2 = await prisma.barbershop.upsert({
    where: { slug: "barbearia-carlos-mendes" },
    update: {},
    create: {
      ownerId: user2.id,
      name: "Barbearia do Carlos",
      slug: "barbearia-carlos-mendes",
      plan: "PRO",
      maxBarbers: 5,
      planStatus: "ACTIVE",
    },
  });

  const barber2 = await prisma.barber.upsert({
    where: { slug: "carlos-mendes" },
    update: {},
    create: {
      userId: user2.id,
      barbershopId: shop2.id,
      name: "Carlos Mendes",
      location: "Rio de Janeiro, RJ",
      slug: "carlos-mendes",
      bio: "Barbeiro premiado, referência em cortes clássicos e modernos.",
      coverUrl: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      instagram: "@carlosmendes.barber",
      acceptedPayments: JSON.stringify(["pix", "credit", "cash"]),
      services: {
        create: [
          { name: "Corte Clássico", priceInCents: 3500, durationMinutes: 40 },
          { name: "Pigmentação",    priceInCents: 8000, durationMinutes: 40 },
        ],
      },
    },
  });

  // Garante os horários de funcionamento
  await prisma.workingHours.deleteMany({ where: { barberId: barber2.id } });
  await prisma.workingHours.createMany({
    data: [
      { barberId: barber2.id, dayOfWeek: 1, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber2.id, dayOfWeek: 2, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber2.id, dayOfWeek: 3, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber2.id, dayOfWeek: 4, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber2.id, dayOfWeek: 5, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
      { barberId: barber2.id, dayOfWeek: 6, startTime: "08:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00" },
    ],
  });

  console.log("✅ Seed concluído.");
  console.log("   Barbeiros: joao@barberflow.com / carlos@barberflow.com");
  console.log("   CPFs: 529.982.247-25 / 877.482.488-00  |  Senha: barber123");
  console.log("   Barbearias: Barbearia do João (PRO) / Barbearia do Carlos (PRO)");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
