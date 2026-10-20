-- CreateEnum
CREATE TYPE "PetType" AS ENUM ('DOG', 'CAT', 'BIRD', 'OTHER');

-- CreateEnum
CREATE TYPE "PetSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "PetGender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ACTIVE', 'REUNITED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_number" VARCHAR(15);

-- CreateTable
CREATE TABLE "pet_reports" (
    "pet_report_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "pet_name" VARCHAR(100),
    "pet_type" "PetType" NOT NULL,
    "breed" VARCHAR(100),
    "color" VARCHAR(100) NOT NULL,
    "size" "PetSize" NOT NULL,
    "gender" "PetGender" NOT NULL,
    "distinctive_features" TEXT,
    "event_date" DATE NOT NULL,
    "contact_info" VARCHAR(255),
    "report_type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_reports_pkey" PRIMARY KEY ("pet_report_id")
);

-- CreateTable
CREATE TABLE "locations" (
    "location_id" SERIAL NOT NULL,
    "pet_report_id" INTEGER NOT NULL,
    "zip_code" VARCHAR(5) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "pet_photos" (
    "pet_photo_id" SERIAL NOT NULL,
    "pet_report_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_photos_pkey" PRIMARY KEY ("pet_photo_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" SERIAL NOT NULL,
    "pet_report_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE INDEX "pet_reports_user_id_idx" ON "pet_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_pet_report_id_key" ON "locations"("pet_report_id");

-- CreateIndex
CREATE INDEX "pet_photos_pet_report_id_idx" ON "pet_photos"("pet_report_id");

-- CreateIndex
CREATE INDEX "messages_pet_report_id_idx" ON "messages"("pet_report_id");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "messages"("user_id");

-- AddForeignKey
ALTER TABLE "pet_reports" ADD CONSTRAINT "pet_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_pet_report_id_fkey" FOREIGN KEY ("pet_report_id") REFERENCES "pet_reports"("pet_report_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_pet_report_id_fkey" FOREIGN KEY ("pet_report_id") REFERENCES "pet_reports"("pet_report_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_pet_report_id_fkey" FOREIGN KEY ("pet_report_id") REFERENCES "pet_reports"("pet_report_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
