-- Tabela de despesas do barbeiro
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barber_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Comissão do barbeiro (staff)
ALTER TABLE "barbers" ADD COLUMN "commission_pct" REAL NOT NULL DEFAULT 50;

-- Controle de no-show por cliente
ALTER TABLE "clients" ADD COLUMN "no_show_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN "is_blocked" INTEGER NOT NULL DEFAULT 0;
