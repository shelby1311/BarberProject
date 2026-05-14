import { Response, NextFunction } from "express";
import { prisma } from "../infra/db/connection";
import { AuthRequest } from "./authMiddleware";
import { BusinessRuleException } from "./AppError";

/**
 * Limites máximos de barbeiros por plano.
 */
const PLAN_LIMITS: Record<string, number> = {
  ESSENTIAL: 1,
  PRO: 5,
  ELITE: 15,
};

/**
 * Planos que têm acesso a recursos em tempo real (Socket.IO).
 */
const REALTIME_PLANS = new Set(["PRO", "ELITE"]);

/**
 * Planos que têm acesso a fila de espera ilimitada.
 * ESSENTIAL: sem fila, PRO: até 15, ELITE: ilimitada.
 */
const QUEUE_LIMITS: Record<string, number> = {
  ESSENTIAL: 0,
  PRO: 15,
  ELITE: Infinity,
};

/**
 * Middleware que verifica se a barbearia do barbeiro autenticado
 * não excedeu o limite de barbeiros do seu plano.
 * Deve ser usado em rotas que adicionam barbeiros à equipe.
 */
export async function planBarberLimitGuard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { barbershop: { include: { barbers: true } } },
    });

    if (!barber) {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Barbeiro não encontrado." });
    }

    const shop = barber.barbershop;
    const limit = PLAN_LIMITS[shop.plan] ?? 1;

    if (shop.barbers.length >= limit) {
      throw new BusinessRuleException(
        `Limite de ${limit} barbeiro(s) do plano ${shop.plan} atingido. Faça upgrade para adicionar mais profissionais.`
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verifica se o plano do barbeiro tem acesso a recursos em tempo real.
 */
export function requireRealtimePlan(req: AuthRequest, res: Response, next: NextFunction) {
  // A validação real será feita no socket loader, mas este middleware
  // pode ser usado em rotas que dependem de tempo real
  next();
}

/**
 * Retorna os limites do plano de uma barbearia.
 */
export async function getPlanLimits(barbershopId: string): Promise<{
  plan: string;
  maxBarbers: number;
  maxQueue: number;
  hasRealtime: boolean;
}> {
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId } });
  if (!shop) {
    return { plan: "ESSENTIAL", maxBarbers: 1, maxQueue: 0, hasRealtime: false };
  }

  return {
    plan: shop.plan,
    maxBarbers: PLAN_LIMITS[shop.plan] ?? 1,
    maxQueue: QUEUE_LIMITS[shop.plan] ?? 0,
    hasRealtime: REALTIME_PLANS.has(shop.plan),
  };
}

export { PLAN_LIMITS, REALTIME_PLANS, QUEUE_LIMITS };
