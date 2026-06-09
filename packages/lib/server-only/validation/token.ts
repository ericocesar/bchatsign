import crypto from 'node:crypto';

import { SEALED_PDF_TOKEN_BYTES } from './constants';

const HASH_ALGORITHM = 'sha512';

export type GenerateSealedPdfTokenResult = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export const generateSealedPdfToken = (): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(SEALED_PDF_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashSealedPdfToken(token);

  return { token, tokenHash };
};

export const hashSealedPdfToken = (token: string): string => {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');
};

export const truncateTokenHashForLog = (tokenHash: string): string => {
  if (tokenHash.length <= 12) {
    return tokenHash;
  }

  return `${tokenHash.slice(0, 6)}…${tokenHash.slice(-4)}`;
};

export const isTokenExpired = (expiresAt: Date | null | undefined, now: Date = new Date()) => {
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() <= now.getTime();
};

export const safeTokenEqual = (expected: string, provided: string): boolean => {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};
