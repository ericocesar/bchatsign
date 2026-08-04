import { DocumentStatus } from '@bchatsign/prisma/generated/types';

export const isDocumentStatus = (value: unknown): value is DocumentStatus => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.values(DocumentStatus).includes(value as DocumentStatus);
};
