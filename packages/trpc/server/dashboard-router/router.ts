import { router } from '../trpc';
import { getDashboardStatsRoute } from './get-stats';

export const dashboardRouter = router({
  getStats: getDashboardStatsRoute,
});
