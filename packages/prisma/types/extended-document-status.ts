import { DocumentStatus } from '@bchatsign/prisma/generated/types';

export const ExtendedDocumentStatus = {
  ...DocumentStatus,
  INBOX: 'INBOX',
  ALL: 'ALL',
} as const;

export type ExtendedDocumentStatus = (typeof ExtendedDocumentStatus)[keyof typeof ExtendedDocumentStatus];
