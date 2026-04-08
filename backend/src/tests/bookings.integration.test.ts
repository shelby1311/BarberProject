import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../server";
import { prisma } from "../infra/db/connection";

// Testes de integração — rotas de agendamento e autenticação
// Requerem banco de dados de teste (DATABASE_URL apontando para DB de teste)

describe("POST /api/auth/register", () => {
  const cpf = "529.982.247-25"; // CPF válido para teste

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: "test-vitest@barberflow.com" } });
  });

  it("retorna 400 para CPF inválido", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Teste",
      cpf: "000.000.000-00",
      email: "test-vitest@barberflow.com",
      password: "123456",
      role: "client",
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("cria cliente com dados válidos", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Teste Vitest",
      cpf,
      email: "test-vitest@barberflow.com",
      password: "123456",
      role: "client",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe("client");
  });

  it("retorna 409 para CPF duplicado", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Outro",
      cpf,
      email: "outro@barberflow.com",
      password: "123456",
      role: "client",
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/bookings", () => {
  it("retorna 400 para body inválido", async () => {
    const res = await request(app).post("/api/bookings").send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("retorna 404 para barbeiro inexistente", async () => {
    const res = await request(app).post("/api/bookings").send({
      barberId: "nao-existe",
      serviceId: "nao-existe",
      clientName: "João",
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /health", () => {
  it("retorna status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
