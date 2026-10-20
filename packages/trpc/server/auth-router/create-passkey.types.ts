import { ZNameSchema } from '@bchatsign/lib/types/name';
import { ZRegistrationResponseJSONSchema } from '@bchatsign/lib/types/webauthn';
import { z } from 'zod';

export const ZCreatePasskeyRequestSchema = z.object({
  passkeyName: ZNameSchema,
  verificationResponse: ZRegistrationResponseJSONSchema,
});

export const ZCreatePasskeyResponseSchema = z.void();

export type TCreatePasskeyRequest = z.infer<typeof ZCreatePasskeyRequestSchema>;
export type TCreatePasskeyResponse = z.infer<typeof ZCreatePasskeyResponseSchema>;
