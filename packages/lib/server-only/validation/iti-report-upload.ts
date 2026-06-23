import { prisma } from '@bchatsign/prisma';
import type { EnvelopeItem, ItiReportValidationStatus } from '@prisma/client';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { buildTeamWhereQuery } from '../../utils/teams';
import { classifyItiReportHash } from './iti-report-hash';

export type UploadItiReportOptions = {
  envelopeId: string;
  envelopeItemId: string;
  teamId: number;
  userId: number;
  pdfBytes: Uint8Array;
  pdfName: string;
  validatedHash: string;
  validationDate: Date;
  reportStatus: string;
  signatureCount: number;
  anchoredSignatureCount: number;
  certificateSubject: string;
  certificateIssuer: string;
  documentDataId: string;
};

export type UploadItiReportResult = {
  envelopeItemId: string;
  status: ItiReportValidationStatus;
  hashMatches: boolean;
};

export const uploadItiReport = async (options: UploadItiReportOptions): Promise<UploadItiReportResult> => {
  const {
    envelopeId,
    envelopeItemId,
    teamId,
    userId,
    pdfName,
    pdfBytes,
    validatedHash,
    validationDate,
    reportStatus,
    signatureCount,
    anchoredSignatureCount,
    certificateSubject,
    certificateIssuer,
    documentDataId,
  } = options;

  const envelopeItem = await prisma.envelopeItem.findFirst({
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
      itiReportDocumentDataId: true,
    },
  });

  if (!envelopeItem) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Envelope item not found',
      statusCode: 404,
    });
  }

  if (!envelopeItem.sealedPdfSha256) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Envelope item has no sealed PDF; upload the report after sealing',
      statusCode: 400,
    });
  }

  if (pdfBytes.byteLength === 0) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Report PDF is empty',
      statusCode: 400,
    });
  }

  void pdfName;

  const { status, hashMatches } = classifyItiReportHash({
    validatedHash,
    sealedPdfSha256: envelopeItem.sealedPdfSha256,
    reportStatus,
  });

  const updated = await prisma.envelopeItem.update({
    where: { id: envelopeItem.id },
    data: {
      itiReportDocumentDataId: documentDataId,
      itiReportValidationStatus: status,
      itiReportValidatedHash: validatedHash,
      itiReportValidationDate: validationDate,
      itiReportUploadedAt: new Date(),
      itiReportSignatureCount: signatureCount,
      itiReportAnchoredSignatureCount: anchoredSignatureCount,
      itiReportCertificateSubject: certificateSubject,
      itiReportCertificateIssuer: certificateIssuer,
    },
    select: { id: true },
  });

  return {
    envelopeItemId: updated.id,
    status,
    hashMatches,
  };
};

export const loadEnvelopeItemForItiReport = async ({
  envelopeId,
  envelopeItemId,
  teamId,
  userId,
}: {
  envelopeId: string;
  envelopeItemId: string;
  teamId: number;
  userId: number;
}): Promise<
  Pick<EnvelopeItem, 'id' | 'sealedPdfSha256' | 'envelopeId'> & {
    itiReportDocumentData: { id: string } | null;
  }
> => {
  const envelopeItem = await prisma.envelopeItem.findFirst({
    where: {
      id: envelopeItemId,
      envelopeId,
      envelope: {
        team: buildTeamWhereQuery({ teamId, userId }),
      },
    },
    select: {
      id: true,
      envelopeId: true,
      sealedPdfSha256: true,
      itiReportDocumentData: {
        select: { id: true },
      },
    },
  });

  if (!envelopeItem) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Envelope item not found',
      statusCode: 404,
    });
  }

  return envelopeItem;
};
