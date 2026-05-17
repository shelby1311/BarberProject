import { Router } from "express";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../infra/db/connection";
import { encryptCPF, hashCPF } from "../shared/crypto";
import { validate } from "../shared/middlewares/validate";
import { validateStrongPassword } from "../shared/security";
import logger from "../shared/logger";

export const authRouter = Router();

// ─── Brute-force protection (em memória) ────────────────────────────────
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 15;

function checkBruteForce(ip: string): { blocked: boolean; remainingMinutes: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false, remainingMinutes: 0 };

  const elapsed = (now - entry.lastAttempt) / 1000 / 60;
  if (entry.count >= MAX_LOGIN_ATTEMPTS && elapsed < LOGIN_BLOCK_MINUTES) {
    return { blocked: true, remainingMinutes: Math.ceil(LOGIN_BLOCK_MINUTES - elapsed) };
  }

  // Reset após o tempo de bloqueio
  if (elapsed >= LOGIN_BLOCK_MINUTES) {
    loginAttempts.delete(ip);
    return { blocked: false, remainingMinutes: 0 };
  }

  return { blocked: false, remainingMinutes: 0 };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    entry.count += 1;
    entry.lastAttempt = now;
  }
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// ─── Helpers ────────────────────────────────────────────────────────────
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

// ─── Zod schemas ────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
  cpf: z.string().refine((v) => validateCPF(v), "CPF inválido."),
  email: z.string().email("Email inválido."),
  password: z.string().refine(
    (v) => {
      const result = validateStrongPassword(v);
      return result.valid;
    },
    (v) => ({ message: validateStrongPassword(v).message })
  ),
  role: z.enum(["client", "barber"]),
  location: z.string().optional(),
  phone: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens (sem espaços).")
    .optional(),
});

const LoginSchema = z.object({
  cpf: z.string().min(1, "Informe o CPF."),
  password: z.string().min(1),
});

// ─── JWT helpers ────────────────────────────────────────────────────────
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

function signAccessToken(payload: Record<string, unknown>): string {
  const jti = randomBytes(16).toString("hex");
  return jwt.sign(
    { ...payload, jti },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  await prisma.passwordReset.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, cpf, email, password, role]
 *             properties:
 *               name: { type: string }
 *               cpf: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [client, barber] }
 *     responses:
 *       201:
 *         description: Usuário criado com token JWT
 *       409:
 *         description: CPF ou email já cadastrado
 */
authRouter.post("/register", validate(RegisterSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof RegisterSchema>;
    const cpfClean = data.cpf.replace(/\D/g, "");
    const cpfEncrypted = encryptCPF(cpfClean);
    const cpfHash = hashCPF(cpfClean);

    const exists = await prisma.user.findFirst({
      where: { OR: [{ cpfHash }, { email: data.email }] },
    });
    if (exists?.cpfHash === cpfHash) { res.status(409).json({ success: false, code: "CONFLICT", message: "CPF já cadastrado." }); return; }
    if (exists?.email === data.email) { res.status(409).json({ success: false, code: "CONFLICT", message: "Email já cadastrado." }); return; }

    const passwordHash = await bcrypt.hash(data.password, 10);

    if (data.role === "barber") {
      let slug = data.slug ?? slugify(data.name);
      // Garante unicidade
      const conflict = await prisma.barber.findUnique({ where: { slug } });
      if (conflict) slug = `${slug}-${Date.now()}`;

      // Cria o usuário, a barbearia (Barbershop) e o barbeiro numa transação
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            cpf: cpfEncrypted,
            cpfHash,
            email: data.email,
            name: data.name,
            passwordHash,
            role: "barber",
          },
        });

        // Cria a Barbershop com o plano ESSENTIAL por padrão
        const shop = await tx.barbershop.create({
          data: {
            ownerId: newUser.id,
            name: `${data.name} Barbearia`,
            slug: `${slug}-shop`,
            plan: "ESSENTIAL",
            maxBarbers: 1,
            planStatus: "TRIAL",
          },
        });

        // Cria o barbeiro vinculado à barbearia
        const barber = await tx.barber.create({
          data: {
            userId: newUser.id,
            barbershopId: shop.id,
            name: data.name,
            location: data.location ?? "",
            phone: data.phone ?? "",
            slug,
          },
        });

        return tx.user.findUnique({
          where: { id: newUser.id },
          include: { barber: { include: { services: true, gallery: true, barbershop: true } } },
        });
      });

      const token = signAccessToken({ userId: user!.id, barberId: user!.barber!.id, role: "barber" });
      res.status(201).json({ token, role: "barber", barber: user!.barber, user: { id: user!.id, name: user!.name, email: user!.email } });
      return;
    }

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

    const token = signAccessToken({ userId: user.id, role: "client", clientId: user.client?.id });
    res.status(201).json({ token, role: "client", user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    logger.error(err, "Erro no registro");
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno." });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login com CPF e senha
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cpf, password]
 *             properties:
 *               cpf: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Token JWT
 *       401:
 *         description: Credenciais inválidas
 */
authRouter.post("/login", validate(LoginSchema), async (req, res) => {
  try {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? "unknown";

    // Verifica brute-force
    const { blocked, remainingMinutes } = checkBruteForce(clientIp);
    if (blocked) {
      logger.warn({ ip: clientIp }, "Login bloqueado por brute-force");
      return res.status(429).json({
        success: false,
        code: "TOO_MANY_ATTEMPTS",
        message: `Muitas tentativas de login. Tente novamente em ${remainingMinutes} minuto(s).`,
      });
    }

    const { cpf, password } = req.body as z.infer<typeof LoginSchema>;
    const cpfHash = hashCPF(cpf.replace(/\D/g, ""));

    const user = await prisma.user.findFirst({
      where: { cpfHash },
      include: { barber: { include: { services: true, gallery: true } }, client: true },
    });
    if (!user) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "CPF ou senha incorretos." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "CPF ou senha incorretos." });
    }

    // Login bem-sucedido: limpa tentativas
    clearLoginAttempts(clientIp);

    const payload =
      user.role === "barber"
        ? { userId: user.id, barberId: user.barber?.id, role: "barber" }
        : { userId: user.id, clientId: user.client?.id, role: "client" };

    const token = signAccessToken(payload);

    res.json({
      token,
      role: user.role,
      barber: user.barber ?? null,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    logger.error(err, "Erro no login");
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno." });
  }
});

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções." });

    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const token = randomUUID();
    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    if (process.env.NODE_ENV !== "production") {
      logger.info({ email, token }, "[RESET DEV] Token de redefinição");
    }

    res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: err.issues[0].message });
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno." });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = z.object({
      token: z.string().uuid(),
      password: z.string().refine(
        (v) => {
          const result = validateStrongPassword(v);
          return result.valid;
        },
        (v) => ({ message: validateStrongPassword(v).message })
      ),
    }).parse(req.body);

    const entry = await prisma.passwordReset.findUnique({ where: { token } });
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "Token inválido ou expirado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } });
    await prisma.passwordReset.delete({ where: { token } });

    res.json({ message: "Senha redefinida com sucesso." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: err.issues[0].message });
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Erro interno." });
  }
});
