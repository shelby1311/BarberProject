import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  barberId?: string;
  clientId?: string;
  role?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token não fornecido." }) as unknown as void;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string; barberId?: string; clientId?: string; role: string;
    };
    req.userId = payload.userId;
    req.barberId = payload.barberId;
    req.clientId = payload.clientId;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido." });
  }
}

export function requireBarber(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== "barber" || !req.barberId) {
    return res.status(403).json({ message: "Acesso restrito a barbeiros." }) as unknown as void;
  }
  next();
}

export function requireClient(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== "client" || !req.clientId) {
    return res.status(403).json({ message: "Acesso restrito a clientes." }) as unknown as void;
  }
  next();
}
