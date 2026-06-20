import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaEnvelopeFindFirst = vi.hoisted(() => vi.fn());
const getFileServerSide = vi.hoisted(() => vi.fn());
const loggerInfo = vi.hoisted(() => vi.fn());
const loggerWarn = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());

vi.mock('@documenso/prisma', () => ({
  prisma: {
    envelope: {
      findFirst: prismaEnvelopeFindFirst,
    },
  },
}));

vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({
  getFileServerSide,
}));

vi.mock('@documenso/lib/utils/logger', () => ({
  logger: {
    child: () => ({
      info: loggerInfo,
      warn: loggerWarn,
      error: loggerError,
    }),
  },
}));

type HonoEnv = {
  Variables: {
    context: { requestMetadata: Record<string, unknown> };
    logger: {
      info: (obj: unknown) => void;
      warn: (obj: unknown) => void;
      error: (obj: unknown) => void;
    };
    requestId: string;
    cspNonce: string;
  };
};

const buildHonoApp = async () => {
  const { publicValidationRoute } = await import('./public-validation');
  const app = new Hono<HonoEnv>();
  app.use('*', async (c, next) => {
    c.set('context', { requestMetadata: {} });
    c.set('logger', {
      info: loggerInfo,
      warn: loggerWarn,
      error: loggerError,
    });
    c.set('requestId', 'req-test-123');
    c.set('cspNonce', 'nonce');
    await next();
  });
  app.route('/public', publicValidationRoute);
  return app;
};

const SEALED_HASH = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';
const BASE_HASH = 'b5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55528';

const buildSealedItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'item-1',
  sealedPdfSha256: SEALED_HASH,
  baseDocumentSha256: BASE_HASH,
  sealedAt: new Date('2026-04-01T10:00:00Z'),
  sealedTimezone: 'America/Recife',
  sealingCertificateSubject: 'CN=Signer',
  sealingCertificateIssuer: 'CN=ICP-Brasil',
  sealingCertificateSerialNumber: 'SERIAL-1',
  pdfSignatureValidationStatus: 'VALID',
  icpBrasilChainValidationStatus: 'VALID',
  internalValidationStatus: 'APPROVED',
  sealedPdfPublicTokenHash: null as string | null,
  sealedPdfPublicUrlExpiresAt: null as Date | null,
  itiReportValidationStatus: null as string | null,
  itiReportValidatedHash: null as string | null,
  itiReportValidationDate: null as Date | null,
  itiReportSignatureCount: null as number | null,
  itiReportAnchoredSignatureCount: null as number | null,
  documentData: {
    id: 'doc-data-1',
    type: 'BYTES_64' as const,
    data: Buffer.from('%PDF-1.4 fake').toString('base64'),
  },
  ...overrides,
});

const buildEnvelope = (items: ReturnType<typeof buildSealedItem>[]) => ({
  id: 'envelope-1',
  status: 'COMPLETED' as const,
  qrToken: 'qr-token-1',
  completedAt: new Date('2026-04-01T10:00:00Z'),
  envelopeItems: items,
});

const setupValidToken = (rawToken: string, overrides: Record<string, unknown> = {}) => {
  const tokenHash = require('node:crypto')
    .createHash('sha512')
    .update(rawToken)
    .digest('hex');
  return buildSealedItem({
    sealedPdfPublicTokenHash: tokenHash,
    sealedPdfPublicUrlExpiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });
};

const collectLogArgs = (calls: unknown[][]) =>
  calls.flatMap((args) => args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))));

describe('publicValidationRoute', () => {
  beforeEach(() => {
    prismaEnvelopeFindFirst.mockReset();
    getFileServerSide.mockReset();
    loggerInfo.mockReset();
    loggerWarn.mockReset();
    loggerError.mockReset();
    getFileServerSide.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]));
  });

  describe('GET /validation/:envelopeId/document.pdf', () => {
    it('rejects a request without a token with 401', async () => {
      const token = 'a-real-token';
      const item = setupValidToken(token);
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request('/public/validation/envelope-1/document.pdf');

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: expect.stringMatching(/invalid|expired/i) });
    });

    it('returns 200 with the PDF body, application/pdf content type, and required security headers when the token is valid', async () => {
      const token = 'a-real-token';
      const item = setupValidToken(token);
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(`/public/validation/envelope-1/document.pdf?token=${token}`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(await res.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
    });

    it('returns 400 listing available items when the envelope has multiple sealed items and envelopeItemId is missing', async () => {
      const token = 'token-abc';
      const item1 = setupValidToken(token, { id: 'item-a' });
      const item2 = buildSealedItem({ id: 'item-b', sealedPdfSha256: 'c'.repeat(64) });
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item1, item2]));

      const app = await buildHonoApp();
      const res = await app.request(`/public/validation/envelope-1/document.pdf?token=${token}`);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/EnvelopeItemId is required/i);
      expect(body.envelopeItems).toEqual([
        { id: 'item-a', title: 'item-a' },
        { id: 'item-b', title: 'item-b' },
      ]);
    });

    it('returns JSON with the sealed PDF URL when _format=application/validador-iti+json is provided', async () => {
      const token = 'token-for-iti';
      const item = setupValidToken(token);
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(
        `/public/validation/envelope-1/document.pdf?token=${token}&_format=application%2Fvalidador-iti%2Bjson`,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { url: string };
      expect(body.url).toContain('/validation/envelope-1/document.pdf');
      expect(body.url).toContain(`token=${token}`);
    });

    it('tolerates extra query parameters (e.g. _secretCode) without returning 400', async () => {
      const token = 'token-extra';
      const item = setupValidToken(token);
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(
        `/public/validation/envelope-1/document.pdf?token=${token}&_secretCode=123&_locale=pt-BR&_rand=42`,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('rejects an expired token with 401', async () => {
      const token = 'expired-token';
      const tokenHash = require('node:crypto').createHash('sha512').update(token).digest('hex');
      const item = buildSealedItem({
        sealedPdfPublicTokenHash: tokenHash,
        sealedPdfPublicUrlExpiresAt: new Date(Date.now() - 60_000),
      });
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(`/public/validation/envelope-1/document.pdf?token=${token}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 when the token does not match the stored hash', async () => {
      const item = setupValidToken('stored-token');
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(`/public/validation/envelope-1/document.pdf?token=different-token`);

      expect(res.status).toBe(401);
    });

    it('returns 404 when the envelope is not in a completed state', async () => {
      prismaEnvelopeFindFirst.mockResolvedValue(null);

      const app = await buildHonoApp();
      const res = await app.request('/public/validation/missing/document.pdf?token=any');

      expect(res.status).toBe(404);
    });

    it('never includes the raw token or the full token hash in any log call', async () => {
      const token = 'strictly-secret-token-aaa-bbb-ccc';
      const item = setupValidToken(token);
      prismaEnvelopeFindFirst.mockResolvedValue(buildEnvelope([item]));

      const app = await buildHonoApp();
      const res = await app.request(`/public/validation/envelope-1/document.pdf?token=${token}`);

      expect(res.status).toBe(200);

      const fullHash = item.sealedPdfPublicTokenHash;
      const allLogArgs = [
        ...collectLogArgs(loggerInfo.mock.calls),
        ...collectLogArgs(loggerWarn.mock.calls),
        ...collectLogArgs(loggerError.mock.calls),
      ];

      for (const arg of allLogArgs) {
        expect(arg).not.toContain(token);
        expect(arg).not.toContain(fullHash);
      }
    });
  });
});
