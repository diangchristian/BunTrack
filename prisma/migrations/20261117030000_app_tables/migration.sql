-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('pcs', 'kg', 'L');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('stock-in', 'adjustment', 'waste', 'sale');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'gcash');

-- CreateEnum
CREATE TYPE "ExpenseBusiness" AS ENUM ('burger', 'iceCream', 'shared');

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "receiptFooter" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "image" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimum" INTEGER NOT NULL DEFAULT 0,
    "unitCost" INTEGER NOT NULL DEFAULT 0,
    "packSize" INTEGER,
    "homemade" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipeLine" (
    "productId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "recipeLine_pkey" PRIMARY KEY ("productId","itemId")
);

-- CreateTable
CREATE TABLE "stockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "change" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "reference" TEXT,
    "supplier" TEXT,
    "note" TEXT,
    "orderId" TEXT,
    "date" DATE NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "cashierId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountReceived" INTEGER NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,

    CONSTRAINT "orderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "business" "ExpenseBusiness" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidVia" "PaymentMethod" NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activityEntry" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "record" TEXT NOT NULL,
    "change" TEXT,

    CONSTRAINT "activityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "recipeLine_itemId_idx" ON "recipeLine"("itemId");

-- CreateIndex
CREATE INDEX "stockMovement_itemId_createdAt_idx" ON "stockMovement"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "stockMovement_orderId_idx" ON "stockMovement"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_number_key" ON "order"("number");

-- CreateIndex
CREATE INDEX "order_date_idx" ON "order"("date");

-- CreateIndex
CREATE INDEX "orderLine_orderId_idx" ON "orderLine"("orderId");

-- CreateIndex
CREATE INDEX "orderLine_productId_idx" ON "orderLine"("productId");

-- CreateIndex
CREATE INDEX "expense_date_idx" ON "expense"("date");

-- CreateIndex
CREATE INDEX "activityEntry_at_idx" ON "activityEntry"("at");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipeLine" ADD CONSTRAINT "recipeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipeLine" ADD CONSTRAINT "recipeLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockMovement" ADD CONSTRAINT "stockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockMovement" ADD CONSTRAINT "stockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockMovement" ADD CONSTRAINT "stockMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderLine" ADD CONSTRAINT "orderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderLine" ADD CONSTRAINT "orderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activityEntry" ADD CONSTRAINT "activityEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Order numbers are shown as "#1001": the first order gets 1001.
SELECT setval(pg_get_serial_sequence('"order"', 'number'), 1000, true);
