-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_barbers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "cover_url" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "reference_point" TEXT NOT NULL DEFAULT '',
    "location_images" TEXT NOT NULL DEFAULT '',
    "commission_pct" REAL NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "queue_count" INTEGER NOT NULL DEFAULT 0,
    "current_service_id" TEXT,
    "current_service_started_at" DATETIME,
    "current_service_estimated_end" DATETIME,
    CONSTRAINT "barbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "barbers_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_barbers" ("avatar_url", "barbershop_id", "bio", "commission_pct", "cover_url", "current_service_estimated_end", "current_service_id", "current_service_started_at", "id", "instagram", "location", "name", "phone", "queue_count", "slug", "status", "user_id") SELECT "avatar_url", "barbershop_id", "bio", "commission_pct", "cover_url", "current_service_estimated_end", "current_service_id", "current_service_started_at", "id", "instagram", "location", "name", "phone", "queue_count", "slug", "status", "user_id" FROM "barbers";
DROP TABLE "barbers";
ALTER TABLE "new_barbers" RENAME TO "barbers";
CREATE UNIQUE INDEX "barbers_user_id_key" ON "barbers"("user_id");
CREATE UNIQUE INDEX "barbers_slug_key" ON "barbers"("slug");
CREATE INDEX "barbers_barbershop_id_idx" ON "barbers"("barbershop_id");
PRAGMA foreign_key_check("barbers");
PRAGMA foreign_keys=ON;
