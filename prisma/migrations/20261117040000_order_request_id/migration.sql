-- AlterTable
ALTER TABLE "order" ADD COLUMN     "clientRequestId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "order_clientRequestId_key" ON "order"("clientRequestId");

