/*
  Warnings:

  - You are about to drop the column `employmentStart` on the `DigitalContract` table. All the data in the column will be lost.
  - You are about to drop the column `terminationDate` on the `DigitalContract` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DigitalContract" DROP COLUMN "employmentStart",
DROP COLUMN "terminationDate";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employmentStart" TIMESTAMP(3),
ADD COLUMN     "terminationDate" TIMESTAMP(3);
