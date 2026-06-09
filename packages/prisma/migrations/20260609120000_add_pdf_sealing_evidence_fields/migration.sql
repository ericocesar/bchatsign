ALTER TABLE "EnvelopeItem"
ADD COLUMN     "base_document_sha256" TEXT,
ADD COLUMN     "sealed_pdf_sha256" TEXT,
ADD COLUMN     "sealed_at" TIMESTAMP(3),
ADD COLUMN     "sealed_timezone" TEXT,
ADD COLUMN     "sealing_certificate_subject" TEXT,
ADD COLUMN     "sealing_certificate_issuer" TEXT,
ADD COLUMN     "sealing_certificate_serial_number" TEXT,
ADD COLUMN     "sealing_certificate_valid_from" TIMESTAMP(3),
ADD COLUMN     "sealing_certificate_valid_to" TIMESTAMP(3),
ADD COLUMN     "sealing_signature_status" TEXT,
ADD COLUMN     "sealing_certificate_chain_status" TEXT;
