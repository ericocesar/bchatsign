import { ZEmailTransportConfigSchema } from '@bchatsign/lib/server-only/email/email-transport-config';
import { ZNameSchema } from '@bchatsign/lib/types/name';
import { z } from 'zod';

export const ZCreateEmailTransportRequestSchema = z.object({
  name: ZNameSchema,
  fromName: ZNameSchema,
  fromAddress: z.string().email(),
  config: ZEmailTransportConfigSchema,
});

export const ZCreateEmailTransportResponseSchema = z.object({
  id: z.string(),
});

export type TCreateEmailTransportRequest = z.infer<typeof ZCreateEmailTransportRequestSchema>;
