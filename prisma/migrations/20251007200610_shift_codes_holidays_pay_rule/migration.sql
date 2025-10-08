-- CreateEnum
CREATE TYPE "PayRuleType" AS ENUM ('NIGHT', 'SUNDAY', 'HOLIDAY', 'OVERTIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TimeSource" AS ENUM ('MANUAL', 'KIOSK', 'MOBILE');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "clockInSource" "TimeSource",
ADD COLUMN     "clockOutSource" "TimeSource",
ADD COLUMN     "codeId" TEXT;

-- CreateTable
CREATE TABLE "ShiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "description" TEXT,
    "windowStartMin" INTEGER,
    "windowEndMin" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PayRuleType" NOT NULL DEFAULT 'CUSTOM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "windowStartMin" INTEGER,
    "windowEndMin" INTEGER,
    "daysOfWeek" INTEGER[],
    "holidayOnly" BOOLEAN NOT NULL DEFAULT false,
    "excludeHolidays" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "percent" DECIMAL(5,2),

    CONSTRAINT "PayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftCode_code_key" ON "ShiftCode"("code");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "ShiftCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
