# BarberFlow

Monorepo com frontend (Next.js), backend (Express) e banco de dados (SQLite local → PostgreSQL produção).

```
ProjectBarber/
├── frontend/    → Next.js 16 + Tailwind
├── backend/     → Express + SQLite (better-sqlite3)
└── database/    → Migrations e seeds SQL
```

## Setup local

### 1. Backend
```bash
cd backend
npm install
npm run db:migrate   # cria as tabelas no SQLite
npm run db:seed      # insere barbeiros e serviços
npm run dev          # http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Endpoints da API

| Método | Rota                          | Descrição                        |
|--------|-------------------------------|----------------------------------|
| GET    | /api/barbers                  | Lista todos os barbeiros         |
| GET    | /api/barbers/:slug            | Busca barbeiro pelo slug         |
| GET    | /api/bookings/:barberId/slots | Slots disponíveis para uma data  |
| POST   | /api/bookings                 | Cria um agendamento              |
| GET    | /health                       | Health check                     |

### POST /api/bookings — body
```json
{
  "barberId": "b1",
  "serviceId": "s1",
  "clientName": "João",
  "startTime": "2025-01-15T10:00:00.000Z",
  "useOnlineDiscount": true
}
```

## Migração para Vercel + PostgreSQL

1. Faça deploy do frontend no Vercel (pasta `frontend/`)
2. Crie um banco Vercel Postgres ou Neon
3. No backend, troque `better-sqlite3` por `@vercel/postgres` e atualize `connection.ts`
4. Configure `DATABASE_URL` e `FRONTEND_URL` nas variáveis de ambiente do Vercel
5. Faça deploy do backend como Vercel Serverless Functions ou Railway/Render
