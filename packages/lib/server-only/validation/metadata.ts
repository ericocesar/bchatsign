import type { Envelope, EnvelopeItem } from '@prisma/client';

import { buildBchatValidationUrl, buildSealedPdfPublicUrl } from './constants';
import { isTokenExpired } from './token';

export type PublicValidationEnvelopeItem = Pick<
  EnvelopeItem,
  | 'id'
  | 'sealedPdfSha256'
  | 'baseDocumentSha256'
  | 'sealedAt'
  | 'sealedTimezone'
  | 'sealingCertificateSubject'
  | 'sealingCertificateIssuer'
  | 'sealingCertificateSerialNumber'
  | 'pdfSignatureValidationStatus'
  | 'icpBrasilChainValidationStatus'
  | 'internalValidationStatus'
  | 'sealedPdfPublicTokenHash'
  | 'sealedPdfPublicUrlExpiresAt'
  | 'itiReportValidationStatus'
  | 'itiReportValidatedHash'
  | 'itiReportValidationDate'
  | 'itiReportSignatureCount'
  | 'itiReportAnchoredSignatureCount'
>;

export type PublicValidationMetadata = {
  envelopeId: string;
  documentStatus: string;
  baseDocumentSha256: string | null;
  sealedPdfSha256: string | null;
  sealedPdfUrl: string | null;
  sealedAt: string | null;
  timezone: string;
  signatureType: 'advanced_electronic_signature_with_icp_brasil_seal';
  pdfSignatureValidationStatus: string | null;
  icpBrasilChainValidationStatus: string | null;
  certificateSubject: string | null;
  certificateIssuer: string | null;
  certificateSerialNumber: string | null;
  itiReport: {
    status: string | null;
    validatedHash: string | null;
    validationDate: string | null;
    signatureCount: number | null;
    anchoredSignatureCount: number | null;
  } | null;
};

export type BuildPublicValidationMetadataOptions = {
  envelope: Pick<Envelope, 'id' | 'status' | 'qrToken' | 'completedAt'>;
  item: PublicValidationEnvelopeItem;
  /**
   * Token brut enviado na requisicao atual. Quando presente e ainda nao
   * expirado, gera-se uma URL absoluta incluindo o proprio token.
   */
  currentToken?: string;
  now?: Date;
};

const SIGNATURE_TYPE = 'advanced_electronic_signature_with_icp_brasil_seal' as const;

export const buildPublicValidationMetadata = ({
  envelope,
  item,
  currentToken,
  now = new Date(),
}: BuildPublicValidationMetadataOptions): PublicValidationMetadata => {
  const tokenValid =
    currentToken !== undefined &&
    item.sealedPdfPublicTokenHash !== null &&
    !isTokenExpired(item.sealedPdfPublicUrlExpiresAt, now);

  const sealedPdfUrl = tokenValid ? buildSealedPdfPublicUrl(envelope.id, currentToken) : null;

  const sealedAtIso = item.sealedAt ? item.sealedAt.toISOString() : null;

  return {
    envelopeId: envelope.id,
    documentStatus: envelope.status,
    baseDocumentSha256: item.baseDocumentSha256 ?? null,
    sealedPdfSha256: item.sealedPdfSha256 ?? null,
    sealedPdfUrl,
    sealedAt: sealedAtIso,
    timezone: item.sealedTimezone ?? 'America/Recife',
    signatureType: SIGNATURE_TYPE,
    pdfSignatureValidationStatus: item.pdfSignatureValidationStatus ?? null,
    icpBrasilChainValidationStatus: item.icpBrasilChainValidationStatus ?? null,
    certificateSubject: item.sealingCertificateSubject ?? null,
    certificateIssuer: item.sealingCertificateIssuer ?? null,
    certificateSerialNumber: item.sealingCertificateSerialNumber ?? null,
    itiReport: item.itiReportValidationStatus
      ? {
          status: item.itiReportValidationStatus,
          validatedHash: item.itiReportValidatedHash ?? null,
          validationDate: item.itiReportValidationDate ? item.itiReportValidationDate.toISOString() : null,
          signatureCount: item.itiReportSignatureCount ?? null,
          anchoredSignatureCount: item.itiReportAnchoredSignatureCount ?? null,
        }
      : null,
  };
};

export const buildBchatValidationUrlFromEnvelope = (qrToken: string | null | undefined) => {
  if (!qrToken) {
    return null;
  }

  return buildBchatValidationUrl(qrToken);
};
