import { ItiReportValidationStatus } from '@prisma/client';
import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const uploadItiReportMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/envelope/item/{envelopeItemId}/iti-report',
    summary: 'Upload VALIDAR/ITI report',
    description:
      'Anexa o relatorio oficial emitido pelo VALIDAR/ITI a um EnvelopeItem lacrado, ' +
      'compara o hash informado com sealedPdfSha256 e marca o status de validacao.',
    tags: ['Envelope Items'],
  },
};

export const extractItiReportMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/envelope/item/{envelopeItemId}/iti-report/extract',
    summary: 'Extract VALIDAR/ITI report fields',
    description:
      'Recebe o PDF do relatorio e devolve os campos reconhecidos automaticamente ' +
      '(hash, data, status, contadores, dados do certificado) para pre-preenchimento no formulario.',
    tags: ['Envelope Items'],
  },
};

export const ZUploadItiReportRequestSchema = z.object({
  envelopeId: z.string(),
  envelopeItemId: z.string(),
  data: z.object({
    file: z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      base64: z.string().min(1),
    }),
    validatedHash: z.string().min(64).max(128),
    validationDate: z.coerce.date(),
    status: z.string().min(1).max(32),
    signatureCount: z.number().int().nonnegative(),
    anchoredSignatureCount: z.number().int().nonnegative(),
    certificateSubject: z.string().min(1).max(512),
    certificateIssuer: z.string().min(1).max(512),
  }),
});

export const ZUploadItiReportResponseSchema = z.object({
  envelopeItemId: z.string(),
  status: z.nativeEnum(ItiReportValidationStatus),
  hashMatches: z.boolean(),
});

export type TUploadItiReportRequest = z.infer<typeof ZUploadItiReportRequestSchema>;
export type TUploadItiReportResponse = z.infer<typeof ZUploadItiReportResponseSchema>;

export const ZExtractItiReportRequestSchema = z.object({
  envelopeId: z.string(),
  envelopeItemId: z.string(),
  file: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    base64: z.string().min(1),
  }),
});

export const ZExtractItiReportResponseSchema = z.object({
  fields: z.object({
    validatedHash: z.string().nullable(),
    validationDate: z.coerce.date().nullable(),
    status: z.string().nullable(),
    signatureCount: z.number().int().nullable(),
    anchoredSignatureCount: z.number().int().nullable(),
    certificateSubject: z.string().nullable(),
    certificateIssuer: z.string().nullable(),
  }),
});

export type TExtractItiReportRequest = z.infer<typeof ZExtractItiReportRequestSchema>;
export type TExtractItiReportResponse = z.infer<typeof ZExtractItiReportResponseSchema>;

export const ZMintSealedPdfTokenRequestSchema = z.object({
  envelopeId: z.string(),
  envelopeItemId: z.string(),
});

export const ZMintSealedPdfTokenResponseSchema = z.object({
  envelopeItemId: z.string(),
  url: z.string().url(),
  expiresAt: z.coerce.date(),
});

export type TMintSealedPdfTokenRequest = z.infer<typeof ZMintSealedPdfTokenRequestSchema>;
export type TMintSealedPdfTokenResponse = z.infer<typeof ZMintSealedPdfTokenResponseSchema>;

export const mintSealedPdfTokenMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/envelope/item/{envelopeItemId}/sealed-pdf-token',
    summary: 'Mint public token for sealed PDF',
    description:
      'Gera (ou rotaciona) um token publico temporario para o PDF final lacrado. ' +
      'O token bruto e devolvido uma unica vez; apenas o hash e persistido.',
    tags: ['Envelope Items'],
  },
};
