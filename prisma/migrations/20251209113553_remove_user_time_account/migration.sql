/*
  Warnings:

  - The values [USERTIMEACCOUNT] on the enum `KpiType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "KpiType_new" AS ENUM ('PAYROLL', 'DASHBOARD', 'TIMEACCOUNT');
ALTER TABLE "KpiCache" ALTER COLUMN "type" TYPE "KpiType_new" USING ("type"::text::"KpiType_new");
ALTER TYPE "KpiType" RENAME TO "KpiType_old";
ALTER TYPE "KpiType_new" RENAME TO "KpiType";
DROP TYPE "public"."KpiType_old";
COMMIT;
