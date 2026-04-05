import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import rateLimit from "express-rate-limit";
import multer from "multer";
import cron from "node-cron";
import { authRouter } from "./routes/auth";
import { barberRouter } from "./routes/barbers";
import { bookingRouter } from "./routes/bookings";
import { subscriptionRouter } from "./routes/subscriptions";
import { AppError } from "./shared/AppError";
import { prisma } from "./infra/db/connection";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json());

// Servir uploads estáticos
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Rate limiting nas rotas de autenticação (máx 10 req/min por IP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, code: "RATE_LIMIT", message: "Muitas tentativas. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer — upload de imagens para /uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas."));
  },
});

// Rota de upload de imagem (avatar ou capa)
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada." });
  const url = `${process.env.BACKEND_URL ?? `http://localhost:${PORT}`}/uploads/${req.file.filename}`;
  res.json({ url });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/barbers", barberRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/subscriptions", subscriptionRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// node-cron — lembrete de agendamento 1h antes (roda a cada 5 minutos)
cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in1h5 = new Date(now.getTime() + 65 * 60 * 1000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: in1h, lte: in1h5 },
      status: { in: ["pending", "confirmed"] },
    },
    include: { barber: { select: { name: true } }, service: { select: { name: true } } },
  });

  for (const a of upcoming) {
    const time = new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    console.log(`[LEMBRETE] ${a.clientName} — ${a.service?.name} com ${a.barber?.name} às ${time} (em ~1h)`);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
