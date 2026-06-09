import { NEXT_PUBLIC_WEBAPP_URL } from '../../constants/app';
import { env } from '../../utils/env';

export const SEALED_PDF_TOKEN_TTL_MS = () => {
  const configured = env('SEALED_PDF_TOKEN_TTL_HOURS');

  if (configured) {
    const parsed = Number.parseInt(configured, 10);

    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 60 * 60 * 1000;
    }
  }

  return 24 * 60 * 60 * 1000;
};

export const SEALED_PDF_TOKEN_BYTES = 32;

export const VALIDAR_ITI_URL = 'https://validar.iti.gov.br/';

export const PUBLIC_VALIDATION_ROUTE = {
  document: (envelopeId: string) => `/public/validation/${envelopeId}/document.pdf`,
  metadata: (envelopeId: string) => `/public/validation/${envelopeId}/metadata`,
};

export const PUBLIC_VALIDATION_HEADERS = {
  cacheControl: 'private, no-store',
  noSniff: 'nosniff',
} as const;

export const buildBchatValidationUrl = (qrToken: string): string => {
  const base = NEXT_PUBLIC_WEBAPP_URL().replace(/\/$/, '');

  return `${base}/share/${qrToken}`;
};

export const buildSealedPdfPublicUrl = (envelopeId: string, token: string): string => {
  const base = NEXT_PUBLIC_WEBAPP_URL().replace(/\/$/, '');

  return `${base}${PUBLIC_VALIDATION_ROUTE.document(envelopeId)}?token=${encodeURIComponent(token)}`;
};
