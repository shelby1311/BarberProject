import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { barberRouter } from "./routes/barbers";
import { bookingRouter } from "./routes/bookings";
import { AppError } from "./shared/AppError";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/barbers", barberRouter);
app.use("/api/bookings", bookingRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

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
