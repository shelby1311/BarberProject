import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infra/db/connection";
import { authMiddleware, requireBarber, AuthRequest } from "../shared/authMiddleware";
import { BusinessRuleException, NotFoundException } from "../shared/AppError";

export const subscriptionRouter = Router();

const PLANS: Record<string, { priceInCents: number; durationDays: number; maxStaff: number }> = {
  BASIC:            { priceInCents:  2990, durationDays:  30, maxStaff: 1 },
  QUARTERLY:        { priceInCents:  7990, durationDays:  90, maxStaff: 1 },
  ANNUAL:           { priceInCents: 24000, durationDays: 365, maxStaff: 1 },
  FAMILY_MONTHLY:   { priceInCents:  7000, durationDays:  30, maxStaff: 5 },
  FAMILY_QUARTERLY: { priceInCents: 16000, durationDays:  90, maxStaff: 5 },
  FAMILY_ANNUAL:    { priceInCents: 55000, durationDays: 365, maxStaff: 5 },
};

// GET /api/subscriptions/plans — lista planos disponíveis
subscriptionRouter.get("/plans", (_req, res) => {
  res.json(
    Object.entries(PLANS).map(([key, val]) => ({ planType: key, ...val }))
  );
});

// POST /api/subscriptions/subscribe — barbeiro assina um plano
subscriptionRouter.post("/subscribe", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { planType } = z.object({ planType: z.enum(Object.keys(PLANS) as [string, ...string[]]) }).parse(req.body);
    const plan = PLANS[planType];

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + plan.durationDays);

    const barber = await prisma.barber.update({
      where: { id: req.barberId },
      data: { planType, planStatus: "ACTIVE", planExpiration: expiration, maxStaff: plan.maxStaff },
    });

    res.json({ success: true, planType, planStatus: "ACTIVE", planExpiration: expiration, priceInCents: plan.priceInCents, barber });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// POST /api/subscriptions/staff — dono do plano família adiciona barbeiro à equipe
subscriptionRouter.post("/staff", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const { staffBarberId } = z.object({ staffBarberId: z.string().min(1) }).parse(req.body);

    const owner = await prisma.barber.findUnique({ where: { id: req.barberId } });
    if (!owner) throw new NotFoundException("Barbeiro");
    if (!owner.planType.startsWith("FAMILY")) {
      throw new BusinessRuleException("Apenas o Plano Família permite adicionar membros à equipe.");
    }

    const staffCount = await prisma.barber.count({ where: { ownerId: req.barberId } });
    if (staffCount >= owner.maxStaff) {
      throw new BusinessRuleException(`Limite de ${owner.maxStaff} barbeiros do plano atingido.`);
    }

    const updated = await prisma.barber.update({
      where: { id: staffBarberId },
      data: { ownerId: req.barberId },
    });

    res.json({ success: true, staff: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// GET /api/subscriptions/staff — lista equipe do plano família
subscriptionRouter.get("/staff", authMiddleware, requireBarber, async (req: AuthRequest, res, next) => {
  try {
    const staff = await prisma.barber.findMany({
      where: { ownerId: req.barberId },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    res.json(staff);
  } catch (err) { next(err); }
});
