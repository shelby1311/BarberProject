import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../infra/db/connection";
import { encryptCPF, decryptCPF, hashCPF } from "../shared/crypto";

export const authRouter = Router();

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function validateCPF(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

const RegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
  cpf: z.string().refine((v) => validateCPF(v), "CPF inválido."),
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
  role: z.enum(["client", "barber"]),
  location: z.string().optional(),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  cpf: z.string().min(1, "Informe o CPF."),
  password: z.string().min(1),
});

authRouter.post("/register", async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const cpfClean = data.cpf.replace(/\D/g, "");
    const cpfEncrypted = encryptCPF(cpfClean);
    const cpfHash = hashCPF(cpfClean);

    const exists = await prisma.user.findFirst({
      where: { OR: [{ cpfHash }, { email: data.email }] },
    });
    if (exists?.cpfHash === cpfHash) { res.status(409).json({ message: "CPF já cadastrado." }); return; }
    if (exists?.email === data.email) { res.status(409).json({ message: "Email já cadastrado." }); return; }

    const passwordHash = await bcrypt.hash(data.password, 10);

    if (data.role === "barber") {
      let slug = slugify(data.name);
      const conflict = await prisma.barber.findUnique({ where: { slug } });
      if (conflict) slug = `${slug}-${Date.now()}`;

      const user = await prisma.user.create({
        data: {
          cpf: cpfEncrypted,
          cpfHash,
          email: data.email,
          name: data.name,
          passwordHash,
          role: "barber",
          barber: {
            create: {
              name: data.name,
              location: data.location ?? "",
              phone: data.phone ?? "",
              slug,
            },
          },
        },
        include: { barber: { include: { services: true, gallery: true } } },
      });

      const token = jwt.sign(
        { userId: user.id, barberId: user.barber!.id, role: "barber" },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );
      res.status(201).json({ token, role: "barber", barber: user.barber, user: { id: user.id, name: user.name, email: user.email } });
      return;
    }

    // Cliente
    const user = await prisma.user.create({
      data: {
        cpf: cpfEncrypted,
        cpfHash,
        email: data.email,
        name: data.name,
        passwordHash,
        role: "client",
        client: { create: { phone: data.phone ?? "" } },
      },
      include: { client: true },
    });

    const token = jwt.sign(
      { userId: user.id, role: "client", clientId: user.client?.id },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    res.status(201).json({ token, role: "client", user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    console.error(err);
    res.status(500).json({ message: "Erro interno." });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { cpf, password } = LoginSchema.parse(req.body);
    const cpfHash = hashCPF(cpf.replace(/\D/g, ""));

    const user = await prisma.user.findFirst({
      where: { cpfHash },
      include: { barber: { include: { services: true, gallery: true } }, client: true },
    });
    if (!user) return res.status(401).json({ message: "CPF ou senha incorretos." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "CPF ou senha incorretos." });

    const payload =
      user.role === "barber"
        ? { userId: user.id, barberId: user.barber?.id, role: "barber" }
        : { userId: user.id, clientId: user.client?.id, role: "client" };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });

    res.json({
      token,
      role: user.role,
      barber: user.barber ?? null,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    res.status(500).json({ message: "Erro interno." });
  }
});

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções." });

    // Invalida tokens anteriores do usuário
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const token = randomUUID();
    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[RESET DEV] Token para ${email}: ${token}`);
    }

    res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    res.status(500).json({ message: "Erro interno." });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = z.object({
      token: z.string().uuid(),
      password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
    }).parse(req.body);

    const entry = await prisma.passwordReset.findUnique({ where: { token } });
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } });
    await prisma.passwordReset.delete({ where: { token } });

    res.json({ message: "Senha redefinida com sucesso." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    res.status(500).json({ message: "Erro interno." });
  }
});
