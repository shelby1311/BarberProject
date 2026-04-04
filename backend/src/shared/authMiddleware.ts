import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  barberId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token não fornecido." }) as unknown as void;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; barberId: string };
    req.userId = payload.userId;
    req.barberId = payload.barberId;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido." });
  }
}
