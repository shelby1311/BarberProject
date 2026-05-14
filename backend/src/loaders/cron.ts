import cron from "node-cron";
import { prisma } from "../infra/db/connection";
import logger from "../shared/logger";

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_INSTANCE = process.env.WHATSAPP_INSTANCE ?? "barberflow";

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!WHATSAPP_API_URL || !WHATSAPP_API_KEY) return;

  const number = `55${phone.replace(/\D/g, "")}`;
  const res = await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: WHATSAPP_API_KEY },
    body: JSON.stringify({ number, text: message }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${body}`);
  }
}

export function cronLoader() {
  // Roda a cada 5 minutos — verifica agendamentos entre 1h e 1h05 à frente
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1h5 = new Date(now.getTime() + 65 * 60 * 1000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        startsAt: { gte: in1h, lte: in1h5 },
        status: { in: ["pending", "confirmed"] },
      },
      include: {
        barber: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        client: { select: { phone: true } },
      },
    });

    for (const a of upcoming) {
      const time = new Date(a.startsAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const phone = a.client?.phone ?? "";
      const message =
        `✂️ *BarberFlow* — Lembrete de agendamento!\n\n` +
        `Olá, *${a.clientName}*! Seu horário com *${a.barber.name}* ` +
        `para *${a.service.name}* é às *${time}* (em ~1 hora).\n\n` +
        `Caso precise cancelar, acesse o app com antecedência. Até logo! 👋`;

      logger.info(
        { appointmentId: a.id, clientName: a.clientName, time, hasPhone: !!phone },
        "Lembrete de agendamento em ~1h"
      );

      if (phone) {
        sendWhatsApp(phone, message).catch((err) =>
          logger.warn({ appointmentId: a.id, err: String(err) }, "Falha ao enviar lembrete WhatsApp")
        );
      }
    }
  });
}
