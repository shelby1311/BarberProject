// DEVE ser o primeiro arquivo carregado — define envs antes de qualquer módulo
import path from "path";
import { config } from "dotenv";

const testDb = path.resolve(__dirname, "..", "..", "test.db");

// override: true garante que sobrescreve qualquer .env já carregado
config({ path: path.resolve(__dirname, "..", "..", ".env.test"), override: true });

process.env.DATABASE_URL = `file:${testDb}`;
process.env.JWT_SECRET = "test-secret-key-for-vitest-only";
process.env.CPF_ENCRYPTION_KEY = "test-encryption-key-for-vitest";
process.env.NODE_ENV = "test";
