import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '@bchatsign/lib/constants/teams';
import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import { jobs } from '@bchatsign/lib/jobs/client';
import { ZWebhookPayloadSchema } from '@bchatsign/lib/types/webhook-payload';
import { buildTeamWhereQuery } from '@bchatsign/lib/utils/teams';
import { prisma } from '@bchatsign/prisma';

import { authenticatedProcedure } from '../trpc';
import { ZResendWebhookCallRequestSchema, ZResendWebhookCallResponseSchema } from './resend-webhook-call.types';

export const resendWebhookCallRoute = authenticatedProcedure
  .input(ZResendWebhookCallRequestSchema)
  .output(ZResendWebhookCallResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { teamId, user } = ctx;
    const { webhookId, webhookCallId } = input;

    ctx.logger.info({
      input: { webhookId, webhookCallId },
    });

    const webhookCall = await prisma.webhookCall.findFirst({
      where: {
        id: webhookCallId,
        webhook: {
          id: webhookId,
          team: buildTeamWhereQuery({
            teamId,
            userId: user.id,
            roles: TEAM_MEMBER_ROLE_PERMISSIONS_MAP.MANAGE_TEAM,
          }),
        },
      },
    });

    if (!webhookCall) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }

    // `requestBody` stores the full delivery envelope; unwrap to the inner
    // document so the handler doesn't wrap it a second time.
    const { payload: data } = ZWebhookPayloadSchema.parse(webhookCall.requestBody);

    await jobs.triggerJob({
      name: 'internal.execute-webhook',
      payload: {
        event: webhookCall.event,
        webhookId,
        data,
      },
    });
  });
