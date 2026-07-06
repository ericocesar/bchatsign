import { z } from 'zod';

export const EnvelopeSigningStatus = z.enum(['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED', 'REJECTED']);

export const EnvelopeSigningFailureReason = z.enum(['SEAL_JOB_FAILED', 'SEAL_JOB_STUCK', 'SEAL_JOB_MISSING']);

export const ZSigningStatusEnvelopeRequestSchema = z.object({
  token: z.string().describe('The recipient token to check the signing status for'),
});

export const ZSigningStatusEnvelopeResponseSchema = z.object({
  status: EnvelopeSigningStatus.describe('The current signing status of the envelope'),
  failureReason: EnvelopeSigningFailureReason.optional().describe(
    'The reason why signing completion processing failed, when status is FAILED',
  ),
});

export type TSigningStatusEnvelopeRequest = z.infer<typeof ZSigningStatusEnvelopeRequestSchema>;
export type TSigningStatusEnvelopeResponse = z.infer<typeof ZSigningStatusEnvelopeResponseSchema>;
