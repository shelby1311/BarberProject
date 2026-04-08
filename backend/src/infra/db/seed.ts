import { prisma } from "./connection";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("barber123", 10);

  await prisma.user.upsert({
    where: { cpf: "52998224725" },
    update: {},
    create: {
      cpf: "52998224725",
      email: "joao@barberflow.com",
      name: "João Silva",
      passwordHash: hash,
      role: "barber",
      barber: {
        create: {
          name: "João Silva",
          location: "São Paulo, SP",
          slug: "joao-silva",
          bio: "Especialista em degradê e barba. 10 anos de experiência no mercado.",
          coverUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
          instagram: "@joaosilva.barber",
          services: {
            create: [
              { name: "Corte Degradê",  priceInCents: 4500, durationMinutes: 40 },
              { name: "Barba Completa", priceInCents: 3000, durationMinutes: 40 },
              { name: "Corte + Barba",  priceInCents: 7000, durationMinutes: 80 },
            ],
          },
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { cpf: "87748248800" },
    update: {},
    create: {
      cpf: "87748248800",
      email: "carlos@barberflow.com",
      name: "Carlos Mendes",
      passwordHash: hash,
      role: "barber",
      barber: {
        create: {
          name: "Carlos Mendes",
          location: "Rio de Janeiro, RJ",
          slug: "carlos-mendes",
          bio: "Barbeiro premiado, referência em cortes clássicos e modernos.",
          coverUrl: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
          instagram: "@carlosmendes.barber",
          services: {
            create: [
              { name: "Corte Clássico", priceInCents: 3500, durationMinutes: 40 },
              { name: "Pigmentação",    priceInCents: 8000, durationMinutes: 40 },
            ],
          },
        },
      },
    },
  });

  console.log("✅ Seed concluído.");
  console.log("   Barbeiros: joao@barberflow.com / carlos@barberflow.com");
  console.log("   CPFs: 529.982.247-25 / 877.482.488-00  |  Senha: barber123");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
