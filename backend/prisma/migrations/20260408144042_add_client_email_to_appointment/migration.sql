-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL DEFAULT '',
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "points_awarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("barber_id", "client_id", "client_name", "created_at", "ends_at", "id", "points_awarded", "service_id", "starts_at", "status") SELECT "barber_id", "client_id", "client_name", "created_at", "ends_at", "id", "points_awarded", "service_id", "starts_at", "status" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
CREATE INDEX "appointments_barber_id_starts_at_idx" ON "appointments"("barber_id", "starts_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
