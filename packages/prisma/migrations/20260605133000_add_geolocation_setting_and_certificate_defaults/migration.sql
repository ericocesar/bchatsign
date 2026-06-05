ALTER TABLE "Envelope"
ALTER COLUMN "certificateAllPages" SET DEFAULT true,
ALTER COLUMN "certificatePosition" SET DEFAULT 'LEFT',
ADD COLUMN "geolocationEnabled" BOOLEAN NOT NULL DEFAULT true;
