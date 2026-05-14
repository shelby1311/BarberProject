import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { authRouter } from "../routes/auth";
import { barberRouter } from "../routes/barbers";
import { bookingRouter } from "../routes/bookings";
import { subscriptionRouter } from "../routes/subscriptions";
import { AppError } from "../shared/AppError";
import logger from "../shared/logger";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const PORT = process.env.PORT ?? 3001;

export function expressLoader(app: Application) {
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = (process.env.FRONTEND_URL ?? "http://localhost:3000")
        .split(",")
        .map(s => s.trim())
        .flatMap(url => [
          url,
          url.replace("localhost", "127.0.0.1"),
          url.replace("127.0.0.1", "localhost"),
        ]);
      if (!origin || allowed.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "..", "..", "uploads")));

  // Swagger
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Rate limiters
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, code: "RATE_LIMIT", message: "Muitas tentativas. Aguarde 1 minuto." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, code: "RATE_LIMIT", message: "Muitas tentativas de upload. Aguarde 1 minuto." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Multer
  const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads"),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Apenas imagens são permitidas."));
    },
  });

  app.post("/api/upload", uploadLimiter, upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada." });
    const fileType = await import("file-type");
    const type = await fileType.fromFile(req.file.path);
    if (!type || !type.mime.startsWith("image/")) {
      const fs = await import("fs");
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Arquivo inválido. Apenas imagens são permitidas." });
    }
    const url = `${process.env.BACKEND_URL ?? `http://localhost:${PORT}`}/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/barbers", barberRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/subscriptions", subscriptionRouter);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
      return;
    }
    logger.error(err, "Unhandled error");
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno do servidor." });
  });
}
