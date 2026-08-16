-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Inventory_reservedQuantity_idx" ON "Inventory"("reservedQuantity");
