import { readFileSync } from 'node:fs';

import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import { mapSecondaryIdToDocumentId } from '@bchatsign/lib/utils/envelope';
import { prisma } from '@bchatsign/prisma';
import { BackgroundJobStatus, DocumentStatus, EnvelopeType, RecipientRole, SigningStatus } from '@prisma/client';

import { maybeAuthenticatedProcedure } from '../trpc';
import {
  ZSigningStatusEnvelopeRequestSchema,
  ZSigningStatusEnvelopeResponseSchema,
} from './signing-status-envelope.types';

const SIGNING_STATUS_PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

const reportSigningStatusDebugEvent = async (
  hypothesisId: 'A' | 'E',
  location: string,
  msg: string,
  data: Record<string, unknown>,
) => {
  let debugServerUrl = 'http://127.0.0.1:7777/event';
  let sessionId = 'signing-processing-failure';

  try {
    const debugEnv = readFileSync('.dbg/signing-processing-failure.env', 'utf8');

    debugServerUrl = debugEnv.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || debugServerUrl;
    sessionId = debugEnv.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || sessionId;
  } catch {
    // Ignore missing local debug env file outside active debug sessions.
  }

  await fetch(debugServerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => undefined);
};

// Internal route - not intended for public API usage
export const signingStatusEnvelopeRoute = maybeAuthenticatedProcedure
  .input(ZSigningStatusEnvelopeRequestSchema)
  .output(ZSigningStatusEnvelopeResponseSchema)
  .query(async ({ input, ctx }) => {
    const { token } = input;

    ctx.logger.info({
      input: {
        token,
      },
    });

    const envelope = await prisma.envelope.findFirst({
      where: {
        type: EnvelopeType.DOCUMENT,
        recipients: {
          some: {
            token,
          },
        },
      },
      include: {
        recipients: {
          select: {
            id: true,
            name: true,
            email: true,
            signingStatus: true,
            role: true,
            signedAt: true,
          },
        },
      },
    });

    if (!envelope) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Envelope not found',
      });
    }

    // Check if envelope is rejected
    if (envelope.status === DocumentStatus.REJECTED) {
      return {
        status: 'REJECTED',
      };
    }

    if (envelope.status === DocumentStatus.COMPLETED) {
      return {
        status: 'COMPLETED',
      };
    }

    const isComplete =
      envelope.recipients.some((recipient) => recipient.signingStatus === SigningStatus.REJECTED) ||
      envelope.recipients.every(
        (recipient) => recipient.role === RecipientRole.CC || recipient.signingStatus === SigningStatus.SIGNED,
      );

    if (isComplete) {
      const latestSealJob = await prisma.backgroundJob.findFirst({
        where: {
          jobId: 'internal.seal-document',
          payload: {
            path: ['documentId'],
            equals: mapSecondaryIdToDocumentId(envelope.secondaryId),
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        select: {
          status: true,
          submittedAt: true,
        },
      });

      const processingExpiredAt = new Date(Date.now() - SIGNING_STATUS_PROCESSING_TIMEOUT_MS);
      const lastRecipientActionAt = envelope.recipients.reduce<Date | null>((latestSignedAt, recipient) => {
        if (!recipient.signedAt) {
          return latestSignedAt;
        }

        if (!latestSignedAt || recipient.signedAt > latestSignedAt) {
          return recipient.signedAt;
        }

        return latestSignedAt;
      }, null);
      const isSealJobStuck =
        latestSealJob !== null &&
        latestSealJob.status !== BackgroundJobStatus.COMPLETED &&
        latestSealJob.submittedAt <= processingExpiredAt;
      const isSealJobMissing =
        latestSealJob === null && lastRecipientActionAt !== null && lastRecipientActionAt <= processingExpiredAt;

      // #region debug-point A:signing-status-complete
      await reportSigningStatusDebugEvent(
        'A',
        'packages/trpc/server/envelope-router/signing-status-envelope.ts:isComplete',
        'evaluated completed envelope signing status',
        {
          envelopeId: envelope.id,
          documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
          envelopeStatus: envelope.status,
          latestSealJobStatus: latestSealJob?.status ?? null,
          latestSealJobSubmittedAt: latestSealJob?.submittedAt?.toISOString() ?? null,
          processingExpiredAt: processingExpiredAt.toISOString(),
          lastRecipientActionAt: lastRecipientActionAt?.toISOString() ?? null,
          isSealJobStuck,
          isSealJobMissing,
          recipientStatuses: envelope.recipients.map((recipient) => ({
            id: recipient.id,
            role: recipient.role,
            signingStatus: recipient.signingStatus,
            signedAt: recipient.signedAt?.toISOString() ?? null,
          })),
        },
      );
      // #endregion

      if (latestSealJob?.status === BackgroundJobStatus.FAILED || isSealJobStuck || isSealJobMissing) {
        const failureReason =
          latestSealJob?.status === BackgroundJobStatus.FAILED
            ? 'SEAL_JOB_FAILED'
            : isSealJobStuck
              ? 'SEAL_JOB_STUCK'
              : 'SEAL_JOB_MISSING';

        // #region debug-point E:signing-status-failed
        await reportSigningStatusDebugEvent(
          'E',
          'packages/trpc/server/envelope-router/signing-status-envelope.ts:failed',
          'returning FAILED from signing status route',
          {
            envelopeId: envelope.id,
            documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
            latestSealJobStatus: latestSealJob?.status ?? null,
            latestSealJobSubmittedAt: latestSealJob?.submittedAt?.toISOString() ?? null,
            isSealJobStuck,
            isSealJobMissing,
            processingExpiredAt: processingExpiredAt.toISOString(),
            failureReason,
          },
        );
        // #endregion

        return {
          status: 'FAILED',
          failureReason,
        };
      }

      // #region debug-point E:signing-status-processing
      await reportSigningStatusDebugEvent(
        'E',
        'packages/trpc/server/envelope-router/signing-status-envelope.ts:processing',
        'returning PROCESSING from signing status route',
        {
          envelopeId: envelope.id,
          documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
          latestSealJobStatus: latestSealJob?.status ?? null,
          latestSealJobSubmittedAt: latestSealJob?.submittedAt?.toISOString() ?? null,
          lastRecipientActionAt: lastRecipientActionAt?.toISOString() ?? null,
          processingExpiredAt: processingExpiredAt.toISOString(),
        },
      );
      // #endregion

      return {
        status: 'PROCESSING',
      };
    }

    return {
      status: 'PENDING',
    };
  });
