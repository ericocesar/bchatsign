import { ApiContractV1 } from '@bchatsign/api/v1/contract';
import { ApiContractV1Implementation } from '@bchatsign/api/v1/implementation';
import { OpenAPIV1 } from '@bchatsign/api/v1/openapi';
import { testCredentialsHandler } from '@bchatsign/lib/server-only/public-api/test-credentials';
import { listDocumentsHandler } from '@bchatsign/lib/server-only/webhooks/zapier/list-documents';
import { subscribeHandler } from '@bchatsign/lib/server-only/webhooks/zapier/subscribe';
import { unsubscribeHandler } from '@bchatsign/lib/server-only/webhooks/zapier/unsubscribe';
// This is a bit nasty. Todo: Extract
import type { HonoEnv } from '@bchatsign/remix/server/router';
import { fetchRequestHandler, TsRestHttpError } from '@ts-rest/serverless/fetch';
import { Hono } from 'hono';

// This is bad, ts-router will be created on each request.
// But don't really have a choice here.
export const tsRestHonoApp = new Hono<HonoEnv>();

tsRestHonoApp
  .get('/openapi', (c) => c.redirect('https://openapi-v1.bchatsign.com'))
  .get('/openapi.json', (c) => c.json(OpenAPIV1))
  .get('/me', async (c) => testCredentialsHandler(c.req.raw));

// Zapier. Todo: (RR7) Check methods. Are these get/post/update requests?
tsRestHonoApp
  .all('/zapier/list-documents', async (c) => listDocumentsHandler(c.req.raw))
  .all('/zapier/subscribe', async (c) => subscribeHandler(c.req.raw))
  .all('/zapier/unsubscribe', async (c) => unsubscribeHandler(c.req.raw));

tsRestHonoApp.mount('/', async (request) => {
  return fetchRequestHandler({
    request,
    contract: ApiContractV1,
    router: ApiContractV1Implementation,
    options: {
      errorHandler: (err) => {
        if (err instanceof TsRestHttpError && err.statusCode === 500) {
          console.error(err);
        }
      },
    },
  });
});
