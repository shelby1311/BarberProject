import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendCancellationEmail(opts: {
  to: string;
  clientName: string;
  barberName: string;
  serviceName: string;
  startsAt: Date;
}) {
  const date = opts.startsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const time = opts.startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  await transporter.sendMail({
    from: `"BarberFlow" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: "Seu agendamento foi cancelado",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#18181b;color:#fff;border-radius:16px">
        <h2 style="color:#f59e0b;margin-bottom:8px">Agendamento Cancelado</h2>
        <p style="color:#a1a1aa">Olá, <strong style="color:#fff">${opts.clientName}</strong>!</p>
        <p style="color:#a1a1aa">Infelizmente o barbeiro <strong style="color:#fff">${opts.barberName}</strong> precisou cancelar seu agendamento:</p>
        <div style="background:#27272a;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:4px 0;color:#fff"><strong>Serviço:</strong> ${opts.serviceName}</p>
          <p style="margin:4px 0;color:#fff"><strong>Data:</strong> ${date}</p>
          <p style="margin:4px 0;color:#fff"><strong>Horário:</strong> ${time}</p>
        </div>
        <p style="color:#a1a1aa">Entre em contato com o barbeiro ou agende um novo horário pelo BarberFlow.</p>
        <p style="color:#52525b;font-size:12px;margin-top:24px">BarberFlow — Plataforma de Agendamento</p>
      </div>
    `,
  });
}
