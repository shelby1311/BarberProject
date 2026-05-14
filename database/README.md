# Database

## Local (SQLite)
O backend usa `better-sqlite3` automaticamente quando `DATABASE_URL` aponta para um arquivo `.db`.

## Produção (PostgreSQL no Vercel)
1. Crie um banco no [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) ou [Neon](https://neon.tech)
2. Troque `DATABASE_URL` no backend para a connection string PostgreSQL
3. Substitua `better-sqlite3` por `pg` ou `@vercel/postgres` no `backend/package.json`
4. Ajuste `backend/src/infra/db/connection.ts` para usar o driver PostgreSQL

## Estrutura
```
migrations/
  001_initial.sql   — cria as tabelas
seeds/
  001_barbers.sql   — dados iniciais
```
