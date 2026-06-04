import { getDashboardStats } from '@documenso/lib/server-only/dashboard/get-dashboard-stats';

import { authenticatedProcedure } from '../trpc';
import { ZGetDashboardStatsRequestSchema, ZGetDashboardStatsResponseSchema } from './get-stats.types';

export const getDashboardStatsRoute = authenticatedProcedure
  .input(ZGetDashboardStatsRequestSchema)
  .output(ZGetDashboardStatsResponseSchema)
  .query(async ({ input, ctx }) => {
    const { teamId } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        teamId,
      },
    });

    return await getDashboardStats({
      userId: user.id,
      teamId,
    });
  });
