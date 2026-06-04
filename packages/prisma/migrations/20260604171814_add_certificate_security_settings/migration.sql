-- CreateEnum
CREATE TYPE "AuthenticationMethod" AS ENUM ('SMS', 'WHATSAPP', 'CAIXA_BCHAT');

-- CreateEnum
CREATE TYPE "CertificatePosition" AS ENUM ('LEFT', 'RIGHT', 'FOOTER');

-- AlterTable
ALTER TABLE "Envelope" ADD COLUMN     "authenticationMethods" "AuthenticationMethod"[] DEFAULT ARRAY[]::"AuthenticationMethod"[],
ADD COLUMN     "certificateAllPages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certificatePosition" "CertificatePosition" NOT NULL DEFAULT 'FOOTER';
