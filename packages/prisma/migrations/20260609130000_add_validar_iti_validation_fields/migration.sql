-- CreateEnum
CREATE TYPE "InternalValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'WARNING', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ItiReportValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'HASH_MISMATCH', 'REJECTED');

-- CreateEnum
CREATE TYPE "PdfSignatureValidationStatus" AS ENUM ('VALID', 'INVALID', 'INDETERMINATE', 'NOT_SIGNED');

-- CreateEnum
CREATE TYPE "IcpBrasilChainValidationStatus" AS ENUM ('VALID', 'INVALID', 'UNKNOWN', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "EnvelopeItem"
ADD COLUMN     "pdf_signature_validation_status" "PdfSignatureValidationStatus",
ADD COLUMN     "icp_brasil_chain_validation_status" "IcpBrasilChainValidationStatus",
ADD COLUMN     "internal_validation_status" "InternalValidationStatus",
ADD COLUMN     "sealed_pdf_public_token_hash" TEXT,
ADD COLUMN     "sealed_pdf_public_url_expires_at" TIMESTAMP(3),
ADD COLUMN     "iti_report_uploaded_at" TIMESTAMP(3),
ADD COLUMN     "iti_report_document_data_id" TEXT,
ADD COLUMN     "iti_report_validation_status" "ItiReportValidationStatus",
ADD COLUMN     "iti_report_validated_hash" TEXT,
ADD COLUMN     "iti_report_validation_date" TIMESTAMP(3),
ADD COLUMN     "iti_report_signature_count" INTEGER,
ADD COLUMN     "iti_report_anchored_signature_count" INTEGER,
ADD COLUMN     "iti_report_certificate_subject" TEXT,
ADD COLUMN     "iti_report_certificate_issuer" TEXT;

-- CreateIndex
CREATE INDEX "EnvelopeItem_sealed_pdf_public_token_hash_idx" ON "EnvelopeItem"("sealed_pdf_public_token_hash");

-- CreateIndex
CREATE INDEX "EnvelopeItem_envelopeId_sealed_pdf_public_token_hash_idx" ON "EnvelopeItem"("envelopeId", "sealed_pdf_public_token_hash");

-- AddForeignKey
ALTER TABLE "EnvelopeItem" ADD CONSTRAINT "EnvelopeItem_iti_report_document_data_id_fkey" FOREIGN KEY ("iti_report_document_data_id") REFERENCES "DocumentData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
