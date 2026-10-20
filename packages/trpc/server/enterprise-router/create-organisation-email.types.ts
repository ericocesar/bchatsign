import { ZNameSchema } from '@bchatsign/lib/types/name';
import { zEmail } from '@bchatsign/lib/utils/zod';
import { z } from 'zod';

export const ZCreateOrganisationEmailRequestSchema = z.object({
  emailDomainId: z.string(),
  emailName: ZNameSchema,
  email: zEmail().toLowerCase(),

  // This does not need to be validated to be part of the domain.
  // replyTo: z.string().email().optional(),
});

export const ZCreateOrganisationEmailResponseSchema = z.void();
