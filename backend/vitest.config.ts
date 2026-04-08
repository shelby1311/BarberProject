import { defineConfig } from "vitest/config";
import path from "path";

// O Prisma resolve URLs relativas a partir da pasta prisma/
// então file:./test.db cria prisma/test.db
const testDb = path.resolve(__dirname, "prisma", "test.db");

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    pool: "forks",
    env: {
      DATABASE_URL: `file:${testDb}`,
      JWT_SECRET: "test-secret-key-for-vitest-only",
      CPF_ENCRYPTION_KEY: "test-encryption-key-for-vitest",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/application/**", "src/domain/**"],
    },
  },
});
