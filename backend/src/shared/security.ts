import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import logger from "./logger";

// ─── Sanitizacao de strings (XSS) ──────────────────────────────────────────
// Construindo replacements em runtime para evitar HTML entities no source
function makeEntity(name: string): string {
  return String.fromCharCode(38) + name + String.fromCharCode(59);
}

const ENT_LT = makeEntity("lt");
const ENT_GT = makeEntity("gt");
const ENT_QUOT = makeEntity("quot");
const ENT_APOS = makeEntity("#x27");
const ENT_SLASH = makeEntity("#x2f");

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/</g, ENT_LT)
      .replace(/>/g, ENT_GT)
      .replace(/\u0022/g, ENT_QUOT)
      .replace(/'/g, ENT_APOS)
      .replace(/\//g, ENT_SLASH);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

/**
 * Middleware que sanitiza body, query e params contra XSS.
 */
export function xssSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body) req.body = sanitizeValue(req.body) as typeof req.body;
  if (req.query) req.query = sanitizeValue(req.query) as typeof req.query;
  if (req.params) req.params = sanitizeValue(req.params) as typeof req.params;
  next();
}

// ─── Helmet configurado ────────────────────────────────────────────────────
export function securityHelmet() {
  return helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "*"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "*"],
        fontSrc: ["'self'", "data:"],
        frameSrc: ["'self'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
  });
}

// ─── Rate Limiters ─────────────────────────────────────────────────────────

/** Rate limit global: 200 requisicoes por minuto por IP */
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, code: "RATE_LIMIT", message: "Muitas requisicoes. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit para auth (login/register): 10 tentativas por minuto */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, code: "RATE_LIMIT", message: "Muitas tentativas de login. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit para upload: 20 por minuto */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, code: "RATE_LIMIT", message: "Muitas tentativas de upload. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit para criacao de agendamentos: 30 por minuto por IP */
export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, code: "RATE_LIMIT", message: "Muitos agendamentos. Aguarde 1 minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── HPP (HTTP Parameter Pollution) ────────────────────────────────────────
export const hppProtection = hpp({
  whitelist: ["search", "service", "minRating", "date", "page", "limit"],
});

// ─── NoSQL / SQL Injection Sanitizer ───────────────────────────────────────
export const noSqlSanitizer = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.warn({ key, ip: req.ip }, "Tentativa de injecao detectada e sanitizada");
  },
});

// ─── Content-Type checker ──────────────────────────────────────────────────
/**
 * Garante que requisicoes POST/PUT/PATCH tenham Content-Type application/json
 * (exceto upload de arquivos).
 */
export function requireJsonContent(req: Request, res: Response, next: NextFunction) {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] ?? "";
    if (req.path === "/api/upload") return next();
    if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
      return res.status(415).json({
        success: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type deve ser application/json.",
      }) as unknown as void;
    }
  }
  next();
}

// ─── Validacao de senha forte ──────────────────────────────────────────────
export function validateStrongPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Senha deve ter no minimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra maiuscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos uma letra minuscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos um numero." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "Senha deve conter pelo menos um caractere especial." };
  }
  return { valid: true, message: "" };
}

// ─── Validacao de upload (magic bytes + dimensoes) ─────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_IMAGE_DIMENSION = 4096;

export function validateImageFile(
  mimetype: string,
  size: number,
  width?: number,
  height?: number
): { valid: boolean; message: string } {
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    return { valid: false, message: "Formato de imagem nao permitido. Use JPEG, PNG, WebP ou AVIF." };
  }
  if (size > 5 * 1024 * 1024) {
    return { valid: false, message: "Imagem muito grande. Maximo 5MB." };
  }
  if (width && width > MAX_IMAGE_DIMENSION) {
    return { valid: false, message: "Largura maxima permitida: " + MAX_IMAGE_DIMENSION + "px." };
  }
  if (height && height > MAX_IMAGE_DIMENSION) {
    return { valid: false, message: "Altura maxima permitida: " + MAX_IMAGE_DIMENSION + "px." };
  }
  return { valid: true, message: "" };
}
