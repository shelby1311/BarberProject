import express, { Application } from "express";
import cors from "cors";
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
import {
  securityHelmet,
  xssSanitizer,
  globalRateLimit,
  authRateLimit,
  uploadRateLimit,
  bookingRateLimit,
  hppProtection,
  noSqlSanitizer,
  requireJsonContent,
} from "../shared/security";

const PORT = process.env.PORT ?? 3001;

export function expressLoader(app: Application) {
  // ─── 1. Segurança básica (Helmet + CORS) ──────────────────────────
  app.use(securityHelmet());
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

  // ─── 2. Parsers ───────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ─── 3. Proteção contra poluição de parâmetros ────────────────────
  app.use(hppProtection);

  // ─── 4. Sanitização NoSQL / SQL Injection ─────────────────────────
  app.use(noSqlSanitizer);

  // ─── 5. Sanitização XSS ───────────────────────────────────────────
  app.use(xssSanitizer);

  // ─── 6. Content-Type checker ──────────────────────────────────────
  app.use(requireJsonContent);

  // ─── 7. Rate limit global ─────────────────────────────────────────
  app.use(globalRateLimit);

  // ─── 8. Arquivos estáticos ────────────────────────────────────────
  app.use("/uploads", express.static(path.join(__dirname, "..", "..", "uploads")));

  // ─── 9. Swagger ───────────────────────────────────────────────────
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─── 10. Multer ────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads"),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // Sanitiza o nome original: remove caracteres especiais
      const safeName = file.originalname
        .replace(/\.[^/.]+$/, "") // remove extensão
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 50);
      cb(null, `${Date.now()}-${safeName}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Formato não permitido. Use JPEG, PNG, WebP ou AVIF."));
    },
  });

  app.post("/api/upload", uploadRateLimit, upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada." });
    // Validação extra de magic bytes
    try {
      const fileType = await import("file-type");
      const type = await fileType.fromFile(req.file.path);
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!type || !allowedMimes.includes(type.mime)) {
        const fs = await import("fs");
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Arquivo inválido. Apenas imagens são permitidas." });
      }
    } catch {
      // Se file-type falhar, mantém o arquivo (já filtrado por mimetype)
    }
    const url = `${process.env.BACKEND_URL ?? `http://localhost:${PORT}`}/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // ─── 11. Rotas ─────────────────────────────────────────────────────
  app.use("/api/auth", authRateLimit, authRouter);
  app.use("/api/barbers", barberRouter);
  app.use("/api/bookings", bookingRateLimit, bookingRouter);
  app.use("/api/subscriptions", subscriptionRouter);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // ─── 12. Error handler ─────────────────────────────────────────────
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ success: false, code: "FILE_TOO_LARGE", message: "Arquivo muito grande. Máximo 5MB." });
        return;
      }
      res.status(400).json({ success: false, code: "UPLOAD_ERROR", message: err.message });
      return;
    }
    logger.error(err, "Unhandled error");
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno do servidor." });
  });
}
