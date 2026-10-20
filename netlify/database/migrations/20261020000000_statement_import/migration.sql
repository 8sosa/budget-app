-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'expense',
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_externalId_key" ON "Transaction"("userId", "externalId");
