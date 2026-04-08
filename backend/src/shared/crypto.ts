import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const algorithm = "aes-256-cbc";

function getKey(): Buffer {
  const secret = process.env.CPF_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) throw new Error("CPF_ENCRYPTION_KEY ou JWT_SECRET não configurado.");
  return createHash("sha256").update(secret).digest();
}

export function encryptCPF(cpf: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(cpf, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCPF(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(":");
  if (!ivHex || !dataHex) return encrypted; // fallback para CPFs antigos não criptografados
  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

// Hash determinístico para busca por CPF (não reversível)
export function hashCPF(cpf: string): string {
  const secret = process.env.CPF_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) throw new Error("CPF_ENCRYPTION_KEY ou JWT_SECRET não configurado.");
  return createHash("sha256").update(cpf + secret).digest("hex");
}

export function sanitizeCSVField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}
