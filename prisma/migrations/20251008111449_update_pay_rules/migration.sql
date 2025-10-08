/*
  Warnings:

  - You are about to drop the column `active` on the `PayRule` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `PayRule` table. All the data in the column will be lost.
  - You are about to drop the column `validTo` on the `PayRule` table. All the data in the column will be lost.
  - Added the required column `userId` to the `PayRule` table without a default value. This is not possible if the table is not empty.
  - Made the column `validFrom` on table `PayRule` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PayRule" DROP COLUMN "active",
DROP COLUMN "type",
DROP COLUMN "validTo",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMP(3),
ALTER COLUMN "validFrom" SET NOT NULL;

-- DropEnum
DROP TYPE "public"."PayRuleType";

-- CreateIndex
CREATE INDEX "PayRule_userId_validFrom_idx" ON "PayRule"("userId", "validFrom");

-- AddForeignKey
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
