import { z } from 'zod';

export const ZGetDashboardStatsRequestSchema = z.object({
  teamId: z.number().int().positive(),
});

export const ZGetDashboardStatsResponseSchema = z.object({
  documents: z.object({
    total: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
  }),
  templates: z.object({
    total: z.number().int().nonnegative(),
  }),
  teams: z.object({
    total: z.number().int().nonnegative(),
  }),
});

export type TGetDashboardStatsResponse = z.infer<typeof ZGetDashboardStatsResponseSchema>;
