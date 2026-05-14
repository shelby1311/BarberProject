import { Server as SocketServer } from "socket.io";
import http from "http";

export let io: SocketServer;

export function socketLoader(httpServer: http.Server) {
  io = new SocketServer(httpServer, {
    cors: { origin: process.env.FRONTEND_URL ?? "http://localhost:3000" },
  });

  io.on("connection", (socket) => {
    // ── Salas legadas (compatibilidade) ──────────────────────────────
    socket.on("join:barber", (barberId: string) => {
      socket.join(`barber:${barberId}`);
    });

    // ── Sala por barbearia (multi-tenancy) ───────────────────────────
    socket.on("join:barbershop", (barbershopId: string) => {
      socket.join(`barbershop:${barbershopId}`);
    });

    socket.on("leave:barbershop", (barbershopId: string) => {
      socket.leave(`barbershop:${barbershopId}`);
    });
  });
}
