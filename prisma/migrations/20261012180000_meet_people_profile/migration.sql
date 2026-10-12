-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approxJitterLat" DOUBLE PRECISION,
ADD COLUMN     "approxJitterLng" DOUBLE PRECISION,
ADD COLUMN     "approxLatitude" DOUBLE PRECISION,
ADD COLUMN     "approxLocationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "approxLongitude" DOUBLE PRECISION,
ADD COLUMN     "discoverable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "peopleSearchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "peopleSearchWindowStart" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_discoverable_approxLatitude_approxLongitude_idx" ON "User"("discoverable", "approxLatitude", "approxLongitude");

