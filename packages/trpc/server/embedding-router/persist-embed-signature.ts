import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import { getEmbedSignatureSettingsByTeamId } from '@bchatsign/lib/server-only/embedding/get-embed-signature-settings';
import { upsertEmbedSignature } from '@bchatsign/lib/server-only/embedding/upsert-embed-signature';
import { assertRateLimit } from '@bchatsign/lib/server-only/rate-limit/rate-limit-middleware';
import { persistEmbedSignatureRateLimit } from '@bchatsign/lib/server-only/rate-limit/rate-limits';
import { isRecipientExpired } from '@bchatsign/lib/utils/recipients';
import { prisma } from '@bchatsign/prisma';
import { DocumentStatus, EnvelopeType, SigningStatus } from '@prisma/client';

import { procedure } from '../trpc';
import {
  ZPersistEmbedSignatureRequestSchema,
  ZPersistEmbedSignatureResponseSchema,
} from './persist-embed-signature.types';

export const persistEmbedSignatureRoute = procedure
  .input(ZPersistEmbedSignatureRequestSchema)
  .output(ZPersistEmbedSignatureResponseSchema)
  .mutation(async ({ input, ctx: { metadata } }) => {
    const { token, clientUserId, signature } = input;

    const recipient = await prisma.recipient.findFirst({
      where: {
        token,
        signingStatus: SigningStatus.NOT_SIGNED,
        envelope: {
          type: EnvelopeType.DOCUMENT,
          status: DocumentStatus.PENDING,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        envelope: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!recipient || isRecipientExpired(recipient)) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Recipient not found',
      });
    }

    const { organisationId, isEnabled } = await getEmbedSignatureSettingsByTeamId({
      teamId: recipient.envelope.teamId,
    });

    if (!isEnabled) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, {
        message: 'Persisted embed signatures are not enabled for this organisation',
      });
    }

    // Per recipient rather than per organisation so one token holder can't
    // exhaust a budget shared with other signers.
    const rateLimitResult = await persistEmbedSignatureRateLimit.check({
      ip: metadata.requestMetadata.ipAddress ?? 'unknown',
      identifier: `recipient:${recipient.id}`,
    });

    assertRateLimit(rateLimitResult);

    await upsertEmbedSignature({
      organisationId,
      recipientId: recipient.id,
      email: recipient.email,
      clientUserId,
      signature,
    });

    return {
      success: true,
    };
  });
