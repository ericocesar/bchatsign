import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import type { FindResultResponse } from '@bchatsign/lib/types/search-params';
import { parseDocumentAuditLogData } from '@bchatsign/lib/utils/document-audit-logs';
import { unsafeBuildEnvelopeIdQuery } from '@bchatsign/lib/utils/envelope';
import { prisma } from '@bchatsign/prisma';
import { EnvelopeType } from '@prisma/client';

import { adminProcedure } from '../trpc';
import {
  ZFindDocumentAuditLogsRequestSchema,
  ZFindDocumentAuditLogsResponseSchema,
} from './find-document-audit-logs.types';

export const findDocumentAuditLogsRoute = adminProcedure
  .input(ZFindDocumentAuditLogsRequestSchema)
  .output(ZFindDocumentAuditLogsResponseSchema)
  .query(async ({ input }) => {
    const { envelopeId, page = 1, perPage = 50, orderByColumn = 'createdAt', orderByDirection = 'desc' } = input;

    const envelope = await prisma.envelope.findFirst({
      where: unsafeBuildEnvelopeIdQuery(
        {
          type: 'envelopeId',
          id: envelopeId,
        },
        EnvelopeType.DOCUMENT,
      ),
    });

    if (!envelope) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Envelope not found',
      });
    }

    const [data, count] = await Promise.all([
      prisma.documentAuditLog.findMany({
        where: { envelopeId: envelope.id },
        skip: Math.max(page - 1, 0) * perPage,
        take: perPage,
        orderBy: {
          [orderByColumn]: orderByDirection,
        },
      }),
      prisma.documentAuditLog.count({
        where: { envelopeId: envelope.id },
      }),
    ]);

    const parsedData = data.map((auditLog) => parseDocumentAuditLogData(auditLog));

    return {
      data: parsedData,
      count,
      currentPage: Math.max(page, 1),
      perPage,
      totalPages: Math.ceil(count / perPage),
    } satisfies FindResultResponse<typeof parsedData>;
  });
