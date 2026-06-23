import { prisma } from '@bchatsign/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { buildTeamWhereQuery } from '../../utils/teams';
import { buildSealedPdfPublicUrl, generateSealedPdfToken, SEALED_PDF_TOKEN_TTL_MS } from './';

export type MintSealedPdfTokenOptions = {
  envelopeId: string;
  envelopeItemId: string;
  teamId: number;
  userId: number;
};

export type MintSealedPdfTokenResult = {
  envelopeItemId: string;
  token: string;
  url: string;
  expiresAt: Date;
};

/**
 * Generates a fresh public token for an envelope item's sealed PDF.
 *
 * Persists the hash of the token (never the raw token) and the new expiry,
 * invalidating any previous token. Returns the raw token + canonical URL so
 * the authenticated caller can hand it off to the recipient or VALIDAR/ITI.
 */
export const mintSealedPdfToken = async (options: MintSealedPdfTokenOptions): Promise<MintSealedPdfTokenResult> => {
  const { envelopeId, envelopeItemId, teamId, userId } = options;

  const item = await prisma.envelopeItem.findFirst({
    where: {
      id: envelopeItemId,
      envelopeId,
      envelope: {
        team: buildTeamWhereQuery({ teamId, userId }),
      },
    },
    select: {
      id: true,
      sealedPdfSha256: true,
      sealedAt: true,
    },
  });

  if (!item) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Envelope item not found',
      statusCode: 404,
    });
  }

  if (!item.sealedPdfSha256 || !item.sealedAt) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Envelope item is not sealed yet',
      statusCode: 400,
    });
  }

  const { token, tokenHash } = generateSealedPdfToken();
  const expiresAt = new Date(Date.now() + SEALED_PDF_TOKEN_TTL_MS());

  await prisma.envelopeItem.update({
    where: { id: item.id },
    data: {
      sealedPdfPublicTokenHash: tokenHash,
      sealedPdfPublicUrlExpiresAt: expiresAt,
    },
    select: { id: true },
  });

  return {
    envelopeItemId: item.id,
    token,
    url: buildSealedPdfPublicUrl(envelopeId, token),
    expiresAt,
  };
};
