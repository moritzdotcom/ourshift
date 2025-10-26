-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('SICKNESS');

-- CreateTable
CREATE TABLE "ShiftAbsence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "status" "ChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "AbsenceReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacationDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAbsence_shiftId_key" ON "ShiftAbsence"("shiftId");

-- AddForeignKey
ALTER TABLE "ShiftAbsence" ADD CONSTRAINT "ShiftAbsence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAbsence" ADD CONSTRAINT "ShiftAbsence_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationDay" ADD CONSTRAINT "VacationDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
