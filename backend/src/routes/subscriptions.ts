import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infra/db/connection";
import { authMiddleware, requireBarber, AuthRequest } from "../shared/authMiddleware";
import { BusinessRuleException, NotFoundException } from "../shared/AppError";

export const subscriptionRouter = Router();

interface PlanConfig {
  priceInCents: number;
  durationDays: number;
  maxBarbers: number;
  label: string;
  description: string;
}

const PLANS: Record<string, PlanConfig> = {
  ESSENTIAL: {
    priceInCents: 2990,
    durationDays: 30,
    maxBarbers: 1,
    label: "ESSENTIAL",
    description: "Para profissionais autônomos — 1 barbeiro, sem fila de espera.",
  },
  PRO: {
    priceInCents: 6590,
    durationDays: 30,
    maxBarbers: 5,
    label: "PRO",
    description: "Para equipes em crescimento — até 5 barbeiros, fila de até 15 clientes, tempo real.",
  },
  ELITE: {
    priceInCents: 7990,
    durationDays: 30,
    maxBarbers: 15,
    label: "ELITE",
    description: "Para barbearias completas — até 15 barbeiros, fila ilimitada, tempo real.",
  },
};

// GET /api/subscriptions/plans — lista planos disponíveis
subscriptionRouter.get("/plans", (_req, res) => {
  res.json(
    Object.entries(PLANS).map(([key, val]) => ({
      planType: key,
      priceInCents: val.priceInCents,
      durationDays: val.durationDays,
      maxBarbers: val.maxBarbers,
      label: val.label,
      description: val.description,
    }))
  );
});

// POST /api/subscriptions/subscribe — barbeiro assina/muda de plano
subscriptionRouter.post("/subscribe", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { planType } = z.object({
      planType: z.enum(["ESSENTIAL", "PRO", "ELITE"]),
    }).parse(req.body);

    const plan = PLANS[planType];
    if (!plan) throw new NotFoundException("Plano");

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + plan.durationDays);

    // Busca o barbeiro com a barbearia
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { barbershop: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    // Atualiza o plano na Barbershop
    const updatedShop = await prisma.barbershop.update({
      where: { id: barber.barbershopId },
      data: {
        plan: planType,
        maxBarbers: plan.maxBarbers,
        planStatus: "ACTIVE",
        planExpiration: expiration,
      },
    });

    res.json({
      success: true,
      planType,
      planStatus: "ACTIVE",
      planExpiration: expiration,
      priceInCents: plan.priceInCents,
      barbershop: updatedShop,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// POST /api/subscriptions/staff — adiciona barbeiro à equipe (apenas PRO e ELITE)
subscriptionRouter.post("/staff", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { staffBarberId } = z.object({ staffBarberId: z.string().min(1) }).parse(req.body);

    const owner = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { barbershop: true },
    });
    if (!owner) throw new NotFoundException("Barbeiro");

    const shop = owner.barbershop;

    if (shop.plan === "ESSENTIAL") {
      throw new BusinessRuleException("O plano ESSENTIAL não permite adicionar membros à equipe. Faça upgrade para PRO ou ELITE.");
    }

    // Conta quantos barbeiros já existem na barbearia
    const staffCount = await prisma.barber.count({ where: { barbershopId: shop.id } });
    if (staffCount >= shop.maxBarbers) {
      throw new BusinessRuleException(
        `Limite de ${shop.maxBarbers} barbeiros do plano ${shop.plan} atingido. Faça upgrade para aumentar o limite.`
      );
    }

    const updated = await prisma.barber.update({
      where: { id: staffBarberId },
      data: { barbershopId: shop.id },
    });

    res.json({ success: true, staff: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// GET /api/subscriptions/staff — lista equipe da barbearia
subscriptionRouter.get("/staff", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      select: { barbershopId: true },
    });
    if (!barber) throw new NotFoundException("Barbeiro");

    const staff = await prisma.barber.findMany({
      where: { barbershopId: barber.barbershopId },
      select: { id: true, name: true, slug: true, avatarUrl: true, status: true },
    });

    res.json(staff);
  } catch (err) { next(err); }
});
