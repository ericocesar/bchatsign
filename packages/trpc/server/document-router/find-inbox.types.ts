// import type { OpenApiMeta } from 'trpc-to-openapi';

import { ZDocumentManySchema } from '@bchatsign/lib/types/document';
import { ZFindResultResponse, ZFindSearchParamsSchema } from '@bchatsign/lib/types/search-params';
import type { z } from 'zod';

export const ZFindInboxRequestSchema = ZFindSearchParamsSchema;

export const ZFindInboxResponseSchema = ZFindResultResponse.extend({
  data: ZDocumentManySchema.array(),
});

export type TFindInboxResponse = z.infer<typeof ZFindInboxResponseSchema>;
