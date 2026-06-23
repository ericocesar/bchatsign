import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import {
  buildPublicValidationMetadata,
  hashSealedPdfToken,
  isTokenExpired,
  PUBLIC_VALIDATION_HEADERS,
  type PublicValidationEnvelopeItem,
  safeTokenEqual,
  truncateTokenHashForLog,
} from '@bchatsign/lib/server-only/validation';
import { getFileServerSide } from '@bchatsign/lib/universal/upload/get-file.server';
import { prisma } from '@bchatsign/prisma';
import { type Context, Hono } from 'hono';

import type { HonoEnv } from '../../router';

const ITI_JSON_FORMAT = 'application/validador-iti+json';

type EnvelopeItemWithDocumentData = PublicValidationEnvelopeItem & {
  documentData: { id: string; type: 'S3_PATH' | 'BYTES' | 'BYTES_64'; data: string } | null;
};

type SealedEnvelopeRow = {
  id: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'REJECTED';
  qrToken: string | null;
  completedAt: Date | null;
  envelopeItems: EnvelopeItemWithDocumentData[];
};

const setCommonHeaders = (c: Context<HonoEnv>) => {
  c.header('Cache-Control', PUBLIC_VALIDATION_HEADERS.cacheControl);
  c.header('X-Content-Type-Options', PUBLIC_VALIDATION_HEADERS.noSniff);
};

const loadSealedEnvelope = (envelopeId: string): Promise<SealedEnvelopeRow | null> => {
  return prisma.envelope.findFirst({
    where: {
      id: envelopeId,
      status: 'COMPLETED',
    },
    select: {
      id: true,
      status: true,
      qrToken: true,
      completedAt: true,
      envelopeItems: {
        where: {
          sealedAt: { not: null },
          sealedPdfSha256: { not: null },
        },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          sealedPdfSha256: true,
          baseDocumentSha256: true,
          sealedAt: true,
          sealedTimezone: true,
          sealingCertificateSubject: true,
          sealingCertificateIssuer: true,
          sealingCertificateSerialNumber: true,
          pdfSignatureValidationStatus: true,
          icpBrasilChainValidationStatus: true,
          internalValidationStatus: true,
          sealedPdfPublicTokenHash: true,
          sealedPdfPublicUrlExpiresAt: true,
          itiReportValidationStatus: true,
          itiReportValidatedHash: true,
          itiReportValidationDate: true,
          itiReportSignatureCount: true,
          itiReportAnchoredSignatureCount: true,
          documentData: {
            select: { id: true, type: true, data: true },
          },
        },
      },
    },
  });
};

const resolveEnvelopeItem = (
  envelope: SealedEnvelopeRow,
  envelopeItemId: string | null | undefined,
): { ok: true; item: EnvelopeItemWithDocumentData } | { ok: false; status: 400 | 404; body: unknown } => {
  const sealedItems = envelope.envelopeItems;

  if (sealedItems.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Envelope has no sealed items' },
    };
  }

  if (envelopeItemId) {
    const item = sealedItems.find((i) => i.id === envelopeItemId);
    if (!item) {
      return {
        ok: false,
        status: 404,
        body: { error: 'Envelope item not found or not sealed' },
      };
    }
    return { ok: true, item };
  }

  if (sealedItems.length === 1) {
    return { ok: true, item: sealedItems[0] };
  }

  return {
    ok: false,
    status: 400,
    body: {
      error: 'EnvelopeItemId is required for envelopes with multiple sealed items',
      envelopeItems: sealedItems.map((i) => ({ id: i.id, title: i.id })),
    },
  };
};

const verifyToken = ({
  item,
  providedToken,
  logger,
  requestId,
  envelopeId,
  envelopeItemId,
}: {
  item: PublicValidationEnvelopeItem;
  providedToken: string | null;
  logger: { info: (obj: unknown) => void; warn: (obj: unknown) => void };
  requestId: string | undefined;
  envelopeId: string;
  envelopeItemId: string;
}): boolean => {
  const requestIdValue = requestId ?? null;

  if (!providedToken || !item.sealedPdfPublicTokenHash) {
    logger.warn({
      requestId: requestIdValue,
      envelopeId,
      envelopeItemId,
      reason: !providedToken ? 'missing_token' : 'no_token_hash',
    });
    return false;
  }

  if (isTokenExpired(item.sealedPdfPublicUrlExpiresAt)) {
    logger.warn({
      requestId: requestIdValue,
      envelopeId,
      envelopeItemId,
      tokenHashTruncated: truncateTokenHashForLog(item.sealedPdfPublicTokenHash),
      reason: 'expired',
    });
    return false;
  }

  const providedHash = hashSealedPdfToken(providedToken);

  if (!safeTokenEqual(item.sealedPdfPublicTokenHash, providedHash)) {
    logger.warn({
      requestId: requestIdValue,
      envelopeId,
      envelopeItemId,
      providedHashTruncated: truncateTokenHashForLog(providedHash),
      reason: 'mismatch',
    });
    return false;
  }

  return true;
};

export const publicValidationRoute = new Hono<HonoEnv>()
  /**
   * GET /public/validation/:envelopeId/document.pdf
   *
   * Public, token-authenticated download of the sealed PDF.
   *
   * - Token required (`?token=`), validated against `sealedPdfPublicTokenHash`.
   * - Multi-item envelopes require `?envelopeItemId=...` (400 with item list if missing).
   * - When `_format=application/validador-iti+json` is sent, returns JSON with
   *   the canonical sealed PDF URL (also token-protected).
   * - Tolerates unknown extra query parameters (e.g. `_secretCode` from VALIDAR/ITI).
   */
  .get('/validation/:envelopeId/document.pdf', async (c) => {
    const logger = c.get('logger');
    setCommonHeaders(c);

    const { envelopeId } = c.req.param();
    const token = c.req.query('token');
    const envelopeItemId = c.req.query('envelopeItemId') ?? null;
    const format = c.req.query('_format');

    try {
      const envelope = await loadSealedEnvelope(envelopeId);

      if (!envelope) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'Envelope not found or not completed',
          statusCode: 404,
        });
      }

      const resolved = resolveEnvelopeItem(envelope, envelopeItemId);

      if (!resolved.ok) {
        return c.json(resolved.body, resolved.status);
      }

      const { item } = resolved;

      if (
        !verifyToken({
          item,
          providedToken: token ?? null,
          logger,
          requestId: c.get('requestId'),
          envelopeId,
          envelopeItemId: item.id,
        })
      ) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: 'Invalid or expired token',
          statusCode: 401,
        });
      }

      if (!item.documentData) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'Document data not found',
          statusCode: 404,
        });
      }

      logger.info({
        requestId: c.get('requestId'),
        envelopeId,
        envelopeItemId: item.id,
        tokenHashTruncated: item.sealedPdfPublicTokenHash
          ? truncateTokenHashForLog(item.sealedPdfPublicTokenHash)
          : null,
        format: format ?? 'pdf',
        event: 'public_validation_access',
      });

      if (format === ITI_JSON_FORMAT) {
        const url = new URL(c.req.url);
        url.searchParams.set('token', token ?? '');

        c.header('Content-Type', ITI_JSON_FORMAT);

        return c.json({ url: url.toString() });
      }

      const file = await getFileServerSide({
        type: item.documentData.type,
        data: item.documentData.data,
      }).catch((error) => {
        console.error(error);
        return null;
      });

      if (!file) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'File not found',
          statusCode: 404,
        });
      }

      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', 'inline');

      return c.body(file);
    } catch (error) {
      logger.error({
        requestId: c.get('requestId'),
        envelopeId,
        envelopeItemId,
        error: error instanceof Error ? error.message : String(error),
        event: 'public_validation_error',
      });

      if (error instanceof AppError) {
        const { status, body } = AppError.toRestAPIError(error);
        return c.json({ error: body.message, code: error.code }, status);
      }

      return c.json({ error: 'Internal server error' }, 500);
    }
  })
  /**
   * GET /public/validation/:envelopeId/metadata
   *
   * Public, token-authenticated metadata endpoint.
   * Returns JSON with hashes, validation status and certificate subject/issuer.
   * `sealedPdfUrl` is only included when the token in the current request is
   * valid and unexpired.
   */
  .get('/validation/:envelopeId/metadata', async (c) => {
    const logger = c.get('logger');
    setCommonHeaders(c);
    c.header('Content-Type', 'application/json');

    const { envelopeId } = c.req.param();
    const token = c.req.query('token');
    const envelopeItemId = c.req.query('envelopeItemId') ?? null;

    try {
      const envelope = await loadSealedEnvelope(envelopeId);

      if (!envelope) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'Envelope not found or not completed',
          statusCode: 404,
        });
      }

      const resolved = resolveEnvelopeItem(envelope, envelopeItemId);

      if (!resolved.ok) {
        return c.json(resolved.body, resolved.status);
      }

      const { item } = resolved;

      if (
        !verifyToken({
          item,
          providedToken: token ?? null,
          logger,
          requestId: c.get('requestId'),
          envelopeId,
          envelopeItemId: item.id,
        })
      ) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: 'Invalid or expired token',
          statusCode: 401,
        });
      }

      const metadata = buildPublicValidationMetadata({
        envelope: {
          id: envelope.id,
          status: envelope.status,
          qrToken: envelope.qrToken,
          completedAt: envelope.completedAt,
        },
        item,
        currentToken: token ?? undefined,
      });

      logger.info({
        requestId: c.get('requestId'),
        envelopeId,
        envelopeItemId: item.id,
        tokenHashTruncated: item.sealedPdfPublicTokenHash
          ? truncateTokenHashForLog(item.sealedPdfPublicTokenHash)
          : null,
        event: 'public_validation_metadata_access',
      });

      return c.json(metadata);
    } catch (error) {
      logger.error({
        requestId: c.get('requestId'),
        envelopeId,
        envelopeItemId,
        error: error instanceof Error ? error.message : String(error),
        event: 'public_validation_error',
      });

      if (error instanceof AppError) {
        const { status, body } = AppError.toRestAPIError(error);
        return c.json({ error: body.message, code: error.code }, status);
      }

      return c.json({ error: 'Internal server error' }, 500);
    }
  });
