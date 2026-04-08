import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const backendRoot = path.resolve(__dirname, "..", "..");
const testDb = path.resolve(backendRoot, "test.db");

export async function setup() {
  process.env.DATABASE_URL = `file:${testDb}`;
  process.env.JWT_SECRET = "test-secret-key-for-vitest-only";
  process.env.CPF_ENCRYPTION_KEY = "test-encryption-key-for-vitest";

  // Remove banco anterior para garantir estado limpo
  if (fs.existsSync(testDb)) fs.unlinkSync(testDb);

  // db push aplica o schema diretamente sem histórico de migrations
  execSync("npx prisma db push --force-reset --skip-generate", {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: `file:${testDb}` },
    stdio: "pipe",
  });
}

export async function teardown() {
  if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
}
