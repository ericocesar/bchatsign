import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { createDocumentData } from '@documenso/lib/server-only/document-data/create-document-data';
import {
  assertValidPdf,
  extractItiReportFields,
  mintSealedPdfToken,
  uploadItiReport,
} from '@documenso/lib/server-only/validation';

import { authenticatedProcedure } from '../trpc';
import {
  extractItiReportMeta,
  mintSealedPdfTokenMeta,
  uploadItiReportMeta,
  ZExtractItiReportRequestSchema,
  ZExtractItiReportResponseSchema,
  ZMintSealedPdfTokenRequestSchema,
  ZMintSealedPdfTokenResponseSchema,
  ZUploadItiReportRequestSchema,
  ZUploadItiReportResponseSchema,
} from './iti-report.types';

const decodeBase64 = (value: string): Uint8Array => {
  try {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  } catch (_error) {
    throw new AppError(AppErrorCode.INVALID_BODY, {
      message: 'File is not valid base64',
      statusCode: 400,
    });
  }
};

export const uploadItiReportRoute = authenticatedProcedure
  .meta(uploadItiReportMeta)
  .input(ZUploadItiReportRequestSchema)
  .output(ZUploadItiReportResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { envelopeId, envelopeItemId, data } = input;

    const bytes = decodeBase64(data.file.base64);

    if (bytes.byteLength === 0) {
      throw new AppError(AppErrorCode.INVALID_BODY, {
        message: 'Report PDF is empty',
        statusCode: 400,
      });
    }

    await assertValidPdf(bytes);

    const documentData = await createDocumentData({
      type: 'BYTES_64',
      data: Buffer.from(bytes).toString('base64'),
    });

    const result = await uploadItiReport({
      envelopeId,
      envelopeItemId,
      teamId: ctx.teamId,
      userId: ctx.user.id,
      pdfBytes: bytes,
      pdfName: data.file.name,
      validatedHash: data.validatedHash,
      validationDate: data.validationDate,
      reportStatus: data.status,
      signatureCount: data.signatureCount,
      anchoredSignatureCount: data.anchoredSignatureCount,
      certificateSubject: data.certificateSubject,
      certificateIssuer: data.certificateIssuer,
      documentDataId: documentData.id,
    });

    return result;
  });

export const extractItiReportRoute = authenticatedProcedure
  .meta(extractItiReportMeta)
  .input(ZExtractItiReportRequestSchema)
  .output(ZExtractItiReportResponseSchema)
  .query(async ({ input }) => {
    const bytes = decodeBase64(input.file.base64);

    const fields = await extractItiReportFields(bytes);

    return { fields };
  });

export const mintSealedPdfTokenRoute = authenticatedProcedure
  .meta(mintSealedPdfTokenMeta)
  .input(ZMintSealedPdfTokenRequestSchema)
  .output(ZMintSealedPdfTokenResponseSchema)
  .query(async ({ input, ctx }) => {
    const result = await mintSealedPdfToken({
      envelopeId: input.envelopeId,
      envelopeItemId: input.envelopeItemId,
      teamId: ctx.teamId,
      userId: ctx.user.id,
    });

    return {
      envelopeItemId: result.envelopeItemId,
      url: result.url,
      expiresAt: result.expiresAt,
    };
  });
