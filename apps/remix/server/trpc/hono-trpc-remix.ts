import { createTrpcContext } from '@bchatsign/trpc/server/context';
import { appRouter } from '@bchatsign/trpc/server/router';
import { handleTrpcRouterError } from '@bchatsign/trpc/utils/trpc-error-handler';
import { trpcServer } from '@hono/trpc-server';

/**
 * Trpc server for internal routes like /api/trpc/*
 */
export const reactRouterTrpcServer = trpcServer({
  router: appRouter,
  endpoint: '/api/trpc',
  createContext: async (_, c) => createTrpcContext({ c, requestSource: 'app' }),
  onError: (opts) => handleTrpcRouterError(opts, 'trpc'),
});
