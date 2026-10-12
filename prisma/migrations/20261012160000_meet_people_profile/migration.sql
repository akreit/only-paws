-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approxLatitude" DOUBLE PRECISION,
ADD COLUMN     "approxLocationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "approxLongitude" DOUBLE PRECISION,
ADD COLUMN     "discoverable" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_discoverable_approxLatitude_approxLongitude_idx" ON "User"("discoverable", "approxLatitude", "approxLongitude");
