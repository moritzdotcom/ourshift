-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('PAYROLL', 'DASHBOARD');

-- CreateTable
CREATE TABLE "KpiCache" (
    "id" TEXT NOT NULL,
    "type" "KpiType" NOT NULL,
    "year" INTEGER NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "calculationDoneAt" TIMESTAMP(3) NOT NULL,
    "depsUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiCache_type_year_monthIndex_key" ON "KpiCache"("type", "year", "monthIndex");
