-- CreateEnum
CREATE TYPE "CloseReason" AS ENUM ('NO_LONGER_SEARCHING', 'TAKEN_TO_SHELTER', 'REHOMED', 'OWNER_NOT_FOUND', 'DUPLICATE', 'OTHER');

-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "pet_reports" ADD COLUMN     "close_reason" "CloseReason";

