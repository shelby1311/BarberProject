-- AlterTable
ALTER TABLE "schedule_blocks" ADD COLUMN "end_time" TEXT;
ALTER TABLE "schedule_blocks" ADD COLUMN "start_time" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "points_awarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("barber_id", "client_id", "client_name", "created_at", "id", "service_id", "starts_at", "status") SELECT "barber_id", "client_id", "client_name", "created_at", "id", "service_id", "starts_at", "status" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
CREATE INDEX "appointments_barber_id_starts_at_idx" ON "appointments"("barber_id", "starts_at");
CREATE TABLE "new_barbers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "cover_url" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "plan_type" TEXT NOT NULL DEFAULT 'FREE',
    "plan_status" TEXT NOT NULL DEFAULT 'TRIAL',
    "plan_expiration" DATETIME,
    "max_staff" INTEGER NOT NULL DEFAULT 1,
    "owner_id" TEXT,
    CONSTRAINT "barbers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "barbers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "barbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_barbers" ("avatar_url", "bio", "cover_url", "id", "instagram", "location", "name", "phone", "slug", "user_id") SELECT "avatar_url", "bio", "cover_url", "id", "instagram", "location", "name", "phone", "slug", "user_id" FROM "barbers";
DROP TABLE "barbers";
ALTER TABLE "new_barbers" RENAME TO "barbers";
CREATE UNIQUE INDEX "barbers_user_id_key" ON "barbers"("user_id");
CREATE UNIQUE INDEX "barbers_slug_key" ON "barbers"("slug");
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 0,
    "favorite_barber_ids" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("id", "phone", "user_id") SELECT "id", "phone", "user_id" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE UNIQUE INDEX "clients_user_id_key" ON "clients"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
