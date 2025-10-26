-- DropForeignKey
ALTER TABLE "public"."ChangeRequest" DROP CONSTRAINT "ChangeRequest_shiftId_fkey";

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
