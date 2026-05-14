/*
  Warnings:

  - You are about to drop the column `max_staff` on the `barbers` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `barbers` table. All the data in the column will be lost.
  - You are about to drop the column `plan_expiration` on the `barbers` table. All the data in the column will be lost.
  - You are about to drop the column `plan_status` on the `barbers` table. All the data in the column will be lost.
  - You are about to drop the column `plan_type` on the `barbers` table. All the data in the column will be lost.
  - Added the required column `barbershop_id` to the `barbers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "barbershops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ESSENTIAL',
    "maxBarbers" INTEGER NOT NULL DEFAULT 1,
    "plan_status" TEXT NOT NULL DEFAULT 'TRIAL',
    "plan_expiration" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "commission_pct" REAL NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "queue_count" INTEGER NOT NULL DEFAULT 0,
    "current_service_id" TEXT,
    "current_service_started_at" DATETIME,
    "current_service_estimated_end" DATETIME,
    CONSTRAINT "barbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "barbers_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_barbers" ("avatar_url", "bio", "commission_pct", "cover_url", "id", "instagram", "location", "name", "phone", "slug", "user_id") SELECT "avatar_url", "bio", "commission_pct", "cover_url", "id", "instagram", "location", "name", "phone", "slug", "user_id" FROM "barbers";
DROP TABLE "barbers";
ALTER TABLE "new_barbers" RENAME TO "barbers";
CREATE UNIQUE INDEX "barbers_user_id_key" ON "barbers"("user_id");
CREATE UNIQUE INDEX "barbers_slug_key" ON "barbers"("slug");
CREATE INDEX "barbers_barbershop_id_idx" ON "barbers"("barbershop_id");
PRAGMA foreign_key_check("barbers");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "barbershops_owner_id_key" ON "barbershops"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "barbershops_slug_key" ON "barbershops"("slug");
