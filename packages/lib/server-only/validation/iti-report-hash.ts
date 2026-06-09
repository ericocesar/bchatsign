import { ItiReportValidationStatus } from '@prisma/client';

export const SHA256_HEX_LENGTH = 64;

export const normalizeSha256 = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value
    .trim()
    .replace(/^sha256:/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (!/^[0-9a-f]+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
};

export const isPlausibleSha256 = (value: string | null | undefined): value is string => {
  const normalized = normalizeSha256(value);

  return normalized !== null && normalized.length === SHA256_HEX_LENGTH;
};

export type ClassifyHashResult = {
  status: ItiReportValidationStatus;
  hashMatches: boolean;
};

export type ClassifyItiReportHashOptions = {
  validatedHash: string | null | undefined;
  sealedPdfSha256: string | null | undefined;
  reportStatus: string | null | undefined;
};

/**
 * Compara o hash informado no relatorio VALIDAR/ITI com o `sealedPdfSha256`
 * do envelope e classifica o relatorio em APPROVED, HASH_MISMATCH, REJECTED
 * ou PENDING.
 *
 * Regras:
 * - Se o hash nao puder ser normalizado ou nao casar com `sealedPdfSha256`,
 *   prevalece HASH_MISMATCH (mesmo quando o relatorio declara APPROVED).
 * - Se nao houver `sealedPdfSha256` ainda, retorna PENDING.
 * - Quando o payload declara REJECTED, mantem REJECTED independente do hash.
 */
export const classifyItiReportHash = ({
  validatedHash,
  sealedPdfSha256,
  reportStatus,
}: ClassifyItiReportHashOptions): ClassifyHashResult => {
  if (!sealedPdfSha256) {
    return { status: ItiReportValidationStatus.PENDING, hashMatches: false };
  }

  const normalizedSealed = normalizeSha256(sealedPdfSha256);
  const normalizedValidated = normalizeSha256(validatedHash);

  if (reportStatus && reportStatus.toUpperCase() === 'REJECTED') {
    return { status: ItiReportValidationStatus.REJECTED, hashMatches: false };
  }

  if (!normalizedSealed || !normalizedValidated) {
    return { status: ItiReportValidationStatus.HASH_MISMATCH, hashMatches: false };
  }

  const hashMatches = normalizedSealed === normalizedValidated;

  if (hashMatches) {
    return { status: ItiReportValidationStatus.APPROVED, hashMatches: true };
  }

  return { status: ItiReportValidationStatus.HASH_MISMATCH, hashMatches: false };
};

export const CONFIRMED_SEALED_PDF_SHA256 = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';
