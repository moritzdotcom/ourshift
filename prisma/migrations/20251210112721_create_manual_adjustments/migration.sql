-- CreateTable
CREATE TABLE "ManualAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hoursAdjustment" DECIMAL(10,2) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualAdjustment_userId_year_key" ON "ManualAdjustment"("userId", "year");

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
