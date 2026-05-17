-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "points_cost" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
