/*
  Warnings:

  - A unique constraint covering the columns `[shiftId]` on the table `ChangeRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_shiftId_key" ON "ChangeRequest"("shiftId");
