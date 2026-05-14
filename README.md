# BarberFlow — Plataforma SaaS Multi-Tenant para Barbearias

> **Stack:** Next.js 15 + Express + Prisma 5 + SQLite + Socket.IO  
> **Arquitetura:** Hybrid SaaS Multi-Tenant com planos ESSENTIAL / PRO / ELITE  
> **Design:** Luxury Dark Mode (#050505, #D4AF37 gold accents, backdrop-blur)

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Modelo de Dados](#-modelo-de-dados)
4. [Planos e Limites](#-planos-e-limites)
5. [API — Endpoints](#-api--endpoints)
6. [WebSockets (Socket.IO)](#-websockets-socketio)
7. [Frontend — Páginas e Componentes](#-frontend--páginas-e-componentes)
8. [Estrutura de Diretórios](#-estrutura-de-diretórios)
9. [Como Rodar](#-como-rodar)
10. [Comandos Úteis](#-comandos-úteis)
11. [Variáveis de Ambiente](#-variáveis-de-ambiente)

---

## 🎯 Visão Geral

O **BarberFlow** é uma plataforma completa para gestão de barbearias com modelo de assinatura SaaS. Cada barbearia é um **tenant** (Barbershop) com seu próprio plano, barbeiros, agendamentos e fila em tempo real.

### Funcionalidades Principais

- **Multi-tenant**: Cada barbearia é isolada com seu próprio plano e limites
- **Agendamento Online**: Clientes agendam horários com barbeiros específicos
- **Fila Presencial (Walk-in)**: Gerenciamento de fila física com limites por plano
- **Status em Tempo Real**: Barbeiros alternam entre AVAILABLE / BUSY / BREAK / OFFLINE
- **ETC Algorithm**: Cálculo de tempo estimado de término (startTime + duração + 5min buffer)
- **WebSockets**: Atualizações em tempo real via Socket.IO (salas por barbershop)
- **Planos com Paywall**: ESSENTIAL (grátis), PRO (R$65,90), ELITE (R$79,90)
- **Dashboard Gerencial**: Visão completa de agendamentos, finanças, métricas
- **Página Pública**: Cada barbeiro tem perfil público com Live Badge de status
- **Notificações**: Lembretes de agendamento via WhatsApp (node-cron)
- **Swagger**: Documentação da API em `/api-docs`

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                     │
│  localhost:3000                                              │
│  Pages: /, /barber/[slug], /dashboard, /login, /register    │
│  /favoritos, /financas, /minha-conta, /barber/[slug]/links  │
├─────────────────────────────────────────────────────────────┤
│                    Backend (Express + Socket.IO)             │
│  localhost:3001                                              │
│  REST API + WebSockets                                      │
├─────────────────────────────────────────────────────────────┤
│              Database (SQLite via Prisma 5)                  │
│  backend/prisma/dev.db                                      │
│  Models: User, Client, Barbershop, Barber, Service,         │
│          Appointment, Review, Expense, WorkingHours,         │
│          ScheduleBlock, GalleryImage, PasswordReset          │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Cliente** → Acessa página pública do barbeiro → Agenda horário
2. **Agendamento** → Criado como `pending` → Barbeiro confirma/rejeita no Dashboard
3. **Tempo Real** → Socket.IO emite eventos para sala `barbershop:{id}`
4. **Fila** → Barbeiro adiciona/remove clientes da fila presencial
5. **Status** → Barbeiro altera status → Live Badge atualiza na página pública
6. **ETC** → Calculado automaticamente ao iniciar serviço

---

## 📊 Modelo de Dados

### User
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| cpf | String (unique) | Criptografado AES-256-CBC |
| cpfHash | String | SHA-256 para busca |
| email | String (unique) | Login |
| name | String | Nome completo |
| passwordHash | String | Bcrypt |
| role | String | "client" \| "barber" |

### Barbershop (Tenant)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (uuid) | PK |
| ownerId | String (unique) | FK → User |
| name | String | Nome da barbearia |
| slug | String (unique) | URL amigável |
| plan | String | ESSENTIAL \| PRO \| ELITE |
| maxBarbers | Int | 1 \| 5 \| 15 |
| planStatus | String | TRIAL \| ACTIVE \| EXPIRED \| CANCELED |
| planExpiration | DateTime? | Data de expiração |

### Barber
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| userId | String (unique) | FK → User |
| barbershopId | String | FK → Barbershop |
| name | String | Nome do barbeiro |
| slug | String (unique) | URL amigável |
| status | String | AVAILABLE \| BUSY \| BREAK \| OFFLINE |
| queueCount | Int | Nº de clientes na fila |
| currentServiceId | String? | Serviço em andamento |
| currentServiceStartedAt | DateTime? | Início do serviço atual |
| currentServiceEstimatedEnd | DateTime? | Término estimado (ETC) |
| commissionPct | Float | % de comissão (default 50) |

### Appointment
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| barberId | String | FK → Barber |
| serviceId | String | FK → Service |
| clientId | String? | FK → Client |
| clientName | String | Nome do cliente |
| clientEmail | String | Email do cliente |
| startsAt | DateTime | Início do agendamento |
| endsAt | DateTime? | Fim calculado |
| status | String | pending \| confirmed \| completed \| cancelled \| no_show |

### Demais Models
- **Client**: Dados do cliente (phone, points, favorites, noShowCount, isBlocked)
- **Service**: Serviço oferecido (name, priceInCents, durationMinutes)
- **Review**: Avaliação (rating 1-5, comment)
- **Expense**: Despesa do barbeiro (description, amountInCents, date)
- **WorkingHours**: Horário de funcionamento por dia da semana
- **ScheduleBlock**: Bloqueio de agenda (data inteira ou parcial)
- **GalleryImage**: Fotos da galeria do barbeiro
- **PasswordReset**: Tokens de recuperação de senha

---

## 💰 Planos e Limites

| Recurso | ESSENTIAL (R$0) | PRO (R$65,90) | ELITE (R$79,90) |
|---------|----------------|---------------|-----------------|
| Barbeiros | 1 | 5 | 15 |
| Fila Presencial | ❌ Bloqueado | ✅ Até 15 | ✅ Ilimitado |
| Tempo Real (Socket) | ❌ | ✅ | ✅ |
| Agendamento Online | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Finanças | ✅ | ✅ | ✅ |
| Exportar Dados | ✅ | ✅ | ✅ |

**Definições no código:** [`backend/src/shared/planGuard.ts`](backend/src/shared/planGuard.ts)

```typescript
const PLAN_LIMITS = {
  ESSENTIAL: { maxBarbers: 1, maxQueue: 0, hasRealtime: false },
  PRO:       { maxBarbers: 5, maxQueue: 15, hasRealtime: true },
  ELITE:     { maxBarbers: 15, maxQueue: Infinity, hasRealtime: true },
} as const;
```

---

## 🔌 API — Endpoints

### Autenticação (`/api/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Registro (client ou barber). Cria User + Barbershop + Barber em transação |
| POST | `/api/auth/login` | Login retorna JWT |
| POST | `/api/auth/forgot-password` | Solicitar recuperação de senha |
| POST | `/api/auth/reset-password` | Resetar senha com token |

### Barbeiros (`/api/barbers`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/barbers` | Listar barbeiros (com search, filters) |
| GET | `/api/barbers/:slug` | Perfil público do barbeiro |
| GET | `/api/barbers/me/dashboard` | Dashboard do barbeiro logado |
| PUT | `/api/barbers/me/profile` | Atualizar perfil |
| POST | `/api/barbers/me/services` | Adicionar serviço |
| DELETE | `/api/barbers/me/services/:id` | Remover serviço |
| POST | `/api/barbers/me/gallery` | Adicionar imagem |
| DELETE | `/api/barbers/me/gallery/:id` | Remover imagem |
| GET | `/api/barbers/me/blocks` | Listar bloqueios |
| POST | `/api/barbers/me/blocks` | Criar bloqueio |
| DELETE | `/api/barbers/me/blocks/:id` | Remover bloqueio |
| GET | `/api/barbers/me/occupancy` | Ocupação (slots disponíveis) |
| GET | `/api/barbers/me/export` | Exportar agendamentos (CSV) |
| GET | `/api/barbers/me/expenses` | Listar despesas |
| POST | `/api/barbers/me/expenses` | Adicionar despesa |
| DELETE | `/api/barbers/me/expenses/:id` | Remover despesa |
| GET | `/api/barbers/me/monthly-metrics` | Métricas mensais |
| GET | `/api/barbers/me/blocked-clients` | Clientes bloqueados |
| PATCH | `/api/barbers/me/clients/:clientId/unblock` | Desbloquear cliente |
| **PATCH** | **`/api/barbers/me/status`** | **Alterar status (AVAILABLE/BUSY/BREAK/OFFLINE)** |
| **POST** | **`/api/barbers/me/queue/add`** | **Adicionar cliente à fila** |
| **POST** | **`/api/barbers/me/queue/remove`** | **Remover cliente da fila** |
| PUT | `/api/barbers/me/working-hours` | Atualizar horários |

### Agendamentos (`/api/bookings`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/bookings` | Criar agendamento |
| GET | `/api/bookings/:barberId/slots` | Slots disponíveis |
| PATCH | `/api/bookings/:id/reject` | Rejeitar agendamento |
| PATCH | `/api/bookings/:id/cancel` | Cancelar agendamento |
| PATCH | `/api/bookings/:id/status` | Alterar status |
| GET | `/api/bookings/me` | Agendamentos do cliente |
| POST | `/api/bookings/:id/review` | Avaliar agendamento |
| GET | `/api/bookings/barber/:barberId/reviews` | Avaliações do barbeiro |

### Assinaturas (`/api/subscriptions`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/subscriptions/plans` | Listar planos disponíveis |
| POST | `/api/subscriptions/subscribe` | Assinar/mudar de plano |
| POST | `/api/subscriptions/staff` | Adicionar barbeiro (staff) |
| GET | `/api/subscriptions/staff` | Listar barbeiros do plano |

### Upload
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/upload` | Upload de imagem (multer) |

---

## 🔌 WebSockets (Socket.IO)

### Conexão
```typescript
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");
```

### Eventos de Entrada/Saída (Cliente → Servidor)
| Evento | Payload | Descrição |
|--------|---------|-----------|
| `join:barbershop` | `{ barbershopId: string }` | Entrar na sala da barbearia |
| `leave:barbershop` | `{ barbershopId: string }` | Sair da sala da barbearia |
| `join:barber` | `{ barberId: string }` | (Legado) Sala individual |

### Eventos de Broadcast (Servidor → Cliente)
| Evento | Payload | Descrição |
|--------|---------|-----------|
| `booking:new` | `{ clientName, serviceName, startsAt }` | Novo agendamento |
| `booking:rejected` | `{ appointmentId }` | Agendamento rejeitado |
| `STATUS_CHANGE` | `{ barberId, status }` | Status do barbeiro mudou |
| `QUEUE_UPDATE` | `{ barberId, queueCount }` | Fila atualizada |

**Implementação:** [`backend/src/loaders/socket.ts`](backend/src/loaders/socket.ts)

---

## 🎨 Frontend — Páginas e Componentes

### Páginas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | [`page.tsx`](frontend/app/page.tsx) | Home com busca, filtros, listagem de barbeiros |
| `/barber/[slug]` | [`page.tsx`](frontend/app/barber/[slug]/page.tsx) | Perfil público do barbeiro com Live Badge |
| `/barber/[slug]/links` | [`page.tsx`](frontend/app/barber/[slug]/links/page.tsx) | Links do barbeiro (SSR) |
| `/dashboard` | [`page.tsx`](frontend/app/dashboard/page.tsx) | Dashboard do barbeiro (agenda, status, fila, plano) |
| `/login` | [`page.tsx`](frontend/app/login/page.tsx) | Login |
| `/register` | [`page.tsx`](frontend/app/register/page.tsx) | Registro (client/barber) |
| `/minha-conta` | [`page.tsx`](frontend/app/minha-conta/page.tsx) | Agendamentos do cliente |
| `/favoritos` | [`page.tsx`](frontend/app/favoritos/page.tsx) | Barbeiros favoritos |
| `/financas` | [`page.tsx`](frontend/app/financas/page.tsx) | Finanças com gráficos (Recharts) |

### Componentes Principais

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| Header | [`Header.tsx`](frontend/components/Header.tsx) | Navbar com links, notificações, auth |
| BarberHero | [`BarberHero.tsx`](frontend/presentation/components/BarberHero.tsx) | Hero da página do barbeiro com Live Badge |
| BarberInfo | [`BarberInfo.tsx`](frontend/presentation/components/BarberInfo.tsx) | Informações do barbeiro |
| BookingCalendar | [`BookingCalendar.tsx`](frontend/presentation/components/BookingCalendar.tsx) | Calendário de agendamento (3 passos) |
| ServiceList | [`ServiceList.tsx`](frontend/presentation/components/ServiceList.tsx) | Lista de serviços |
| ImageUpload | [`ImageUpload.tsx`](frontend/components/ImageUpload.tsx) | Upload de imagens |
| ThemeProvider | [`ThemeProvider.tsx`](frontend/components/ThemeProvider.tsx) | Tema (next-themes) |
| QueryProvider | [`QueryProvider.tsx`](frontend/components/QueryProvider.tsx) | React Query provider |

### Context e Hooks

| Arquivo | Descrição |
|---------|-----------|
| [`AuthContext.tsx`](frontend/context/AuthContext.tsx) | Contexto de autenticação (login, logout, role) |
| [`useFavorites.ts`](frontend/hooks/useFavorites.ts) | Hook de favoritos (localStorage) |
| [`usePendingBooking.ts`](frontend/hooks/usePendingBooking.ts) | Hook para agendamento pendente |

### API Client

[`api.ts`](frontend/lib/api.ts) — Cliente HTTP centralizado com todos os métodos:

```typescript
api.register(data)           // Registro
api.login(cpf, password)     // Login
api.getBarbers(search, filters)  // Listar barbeiros
api.getBarber(slug)          // Perfil público
api.getDashboard()           // Dashboard
api.createBooking(data)      // Criar agendamento
api.getSlots(barberId, date) // Slots disponíveis
api.getReviews(barberId)     // Avaliações
api.subscribe(planType)      // Assinar plano
api.updateBarberStatus(status)  // Alterar status
api.addQueue()               // Adicionar fila
api.removeQueue()            // Remover fila
api.uploadImage(file)        // Upload
```

### Tipos TypeScript

[`types/index.ts`](frontend/types/index.ts) — Todos os tipos compartilhados:

```typescript
type PlanType = "ESSENTIAL" | "PRO" | "ELITE";
type BarberStatus = "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE";

interface Barbershop { id, ownerId, name, slug, plan, maxBarbers, planStatus, planExpiration }
interface Barber { id, userId, barbershopId, name, slug, status, queueCount, currentServiceEstimatedEnd, ... }
interface Appointment { id, barberId, clientName, startsAt, status, ... }
interface Service { id, name, priceInCents, durationMinutes }
interface Review { id, rating, comment, createdAt }
```

---

## 📁 Estrutura de Diretórios

```
BarberProject-main/
├── README.md
├── setup.bat
│
├── backend/
│   ├── .env                          # Variáveis de ambiente
│   ├── .env.test                     # Ambiente de teste
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma             # Schema do banco
│   │   ├── dev.db                    # SQLite (desenvolvimento)
│   │   └── migrations/               # Migrations Prisma
│   └── src/
│       ├── server.ts                 # Entry point
│       ├── application/services/
│       │   └── SchedulingService.ts  # Lógica de agendamento + ETC
│       ├── domain/
│       │   ├── entities/             # Interfaces de domínio
│       │   └── pricing/              # Estratégias de desconto
│       ├── infra/
│       │   ├── db/
│       │   │   ├── connection.ts     # Prisma client
│       │   │   ├── migrate.ts        # Script de migração
│       │   │   └── seed.ts           # Dados de seed
│       │   └── repositories/         # Repositories
│       ├── loaders/
│       │   ├── express.ts            # Config Express (CORS, upload, error)
│       │   ├── socket.ts             # Socket.IO (salas, eventos)
│       │   ├── cron.ts               # Tarefas agendadas (WhatsApp)
│       │   └── swagger.ts            # Documentação Swagger
│       ├── routes/
│       │   ├── auth.ts               # Autenticação + registro
│       │   ├── barbers.ts            # CRUD barbeiros + status + fila
│       │   ├── bookings.ts           # Agendamentos
│       │   └── subscriptions.ts      # Planos e assinaturas
│       ├── shared/
│       │   ├── AppError.ts           # Classes de erro
│       │   ├── authMiddleware.ts     # Middleware JWT
│       │   ├── crypto.ts             # Criptografia CPF
│       │   ├── logger.ts             # Pino logger
│       │   ├── mailer.ts             # Nodemailer
│       │   ├── planGuard.ts          # Middleware de planos (paywall)
│       │   └── middlewares/
│       │       └── validate.ts       # Validação Zod
│       └── tests/                    # Testes (Vitest)
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts                # Config Next.js
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── app/
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Estilos globais (Tailwind v4)
│   │   ├── page.tsx                  # Home
│   │   ├── barber/[slug]/page.tsx    # Perfil público
│   │   ├── barber/[slug]/links/      # Links page (SSR)
│   │   ├── dashboard/page.tsx        # Dashboard
│   │   ├── login/page.tsx            # Login
│   │   ├── register/page.tsx         # Registro
│   │   ├── minha-conta/page.tsx      # Agendamentos do cliente
│   │   ├── favoritos/page.tsx        # Favoritos
│   │   └── financas/page.tsx         # Finanças + gráficos
│   ├── components/                   # Componentes reutilizáveis
│   │   ├── Header.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useFavorites.ts
│   │   └── usePendingBooking.ts
│   ├── lib/
│   │   └── api.ts                    # API client
│   ├── presentation/components/      # Componentes de apresentação
│   │   ├── BarberHero.tsx
│   │   ├── BarberInfo.tsx
│   │   ├── BookingCalendar.tsx
│   │   └── ServiceList.tsx
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   ├── sw.js                     # Service Worker
│   │   └── offline.html              # Offline page
│   └── types/
│       └── index.ts                  # Tipos TypeScript
│
├── database/
│   ├── migrations/                   # SQL migrations (referência)
│   └── seeds/                        # SQL seeds (referência)
│
└── plans/
    └── hybrid-saas-implementation-plan.md  # Plano de implementação
```

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- npm

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Editar .env com suas configurações (ver seção abaixo)

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate dev

# Popular banco com dados de seed
npm run db:seed

# Iniciar servidor (desenvolvimento)
npm run dev
# → http://localhost:3001
# → Swagger: http://localhost:3001/api-docs
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar dev server
npm run dev
# → http://localhost:3000
```

### 3. Setup Rápido (Windows)
```bash
setup.bat
```

---

## 📝 Comandos Úteis

### Backend
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Iniciar dev server (ts-node-dev) |
| `npm run build` | Compilar TypeScript |
| `npm start` | Iniciar produção |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:migrate` | Criar migration |
| `npm run db:seed` | Popular banco |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm test` | Rodar testes (Vitest) |
| `npm run test:coverage` | Testes com cobertura |

### Frontend
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Iniciar dev server (Next.js) |
| `npm run build` | Build de produção |
| `npm start` | Iniciar produção |
| `npm run lint` | ESLint |

---

## 🔐 Variáveis de Ambiente

### Backend (`.env`)

```env
# Banco de Dados
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET="sua-chave-secreta-aqui"

# Criptografia CPF
CPF_ENCRYPTION_KEY="chave-de-32-caracteres-para-aes256"

# Ambiente
NODE_ENV="development"

# URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"

# Servidor
PORT=3001
```

### Backend (`.env.test`)

```env
DATABASE_URL="file:./prisma/test.db"
JWT_SECRET="test-secret"
CPF_ENCRYPTION_KEY="test-key-32-chars-aes-256-cbc!!"
NODE_ENV="test"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
```

---

## 🧪 Testes

O projeto usa **Vitest** para testes:

```bash
cd backend
npm test              # Rodar todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Com cobertura
```

Arquivos de teste:
- [`backend/src/tests/bookings.integration.test.ts`](backend/src/tests/bookings.integration.test.ts)
- [`backend/src/tests/SchedulingService.test.ts`](backend/src/tests/SchedulingService.test.ts)
- [`backend/src/tests/setup.ts`](backend/src/tests/setup.ts)
- [`backend/src/tests/envSetup.ts`](backend/src/tests/envSetup.ts)

---

## 🛠 Tecnologias

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express 4
- **ORM:** Prisma 5 + SQLite
- **Auth:** JWT + Bcrypt
- **Validação:** Zod
- **Tempo Real:** Socket.IO 4
- **Agendamento:** node-cron
- **Email:** Nodemailer
- **Upload:** Multer
- **Logs:** Pino
- **Testes:** Vitest + Supertest
- **Documentação:** Swagger

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4
- **Animações:** Framer Motion
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **HTTP:** Socket.IO Client
- **Estado:** React Query (TanStack)
- **Tema:** next-themes
- **PWA:** Service Worker + Manifest

---

## 📄 Licença

Projeto privado — todos os direitos reservados.
