-- KAN-64: Google sign-in. password_hash becomes optional (Google-only accounts
-- have none) and google_id stores Google's account id, one PawRadar account each.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

