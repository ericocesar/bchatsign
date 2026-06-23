import { beforeEach, describe, expect, it, vi } from 'vitest';

const envelopeItemFindFirst = vi.hoisted(() => vi.fn());
const envelopeItemUpdate = vi.hoisted(() => vi.fn());
const createDocumentData = vi.hoisted(() => vi.fn());
const assertValidPdf = vi.hoisted(() => vi.fn());
const extractItiReportFields = vi.hoisted(() => vi.fn());
const uploadItiReport = vi.hoisted(() => vi.fn());
const mintSealedPdfToken = vi.hoisted(() => vi.fn());

vi.mock('@bchatsign/prisma', () => ({
  prisma: {
    envelopeItem: {
      findFirst: envelopeItemFindFirst,
      update: envelopeItemUpdate,
    },
  },
}));

vi.mock('@bchatsign/lib/server-only/document-data/create-document-data', () => ({
  createDocumentData,
}));

vi.mock('@bchatsign/lib/server-only/validation', () => ({
  assertValidPdf,
  extractItiReportFields,
  mintSealedPdfToken,
  uploadItiReport,
}));

const SEALED_HASH = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';
const MISMATCH_HASH = 'b5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55528';

const baseFileBase64 = Buffer.from('%PDF-1.4 minimal').toString('base64');

const buildValidInput = () => ({
  envelopeId: 'envelope-1',
  envelopeItemId: 'item-1',
  data: {
    file: {
      name: 'report.pdf',
      type: 'application/pdf',
      base64: baseFileBase64,
    },
    validatedHash: SEALED_HASH,
    validationDate: new Date('2026-03-01T10:00:00.000Z'),
    status: 'APPROVED',
    signatureCount: 3,
    anchoredSignatureCount: 2,
    certificateSubject: 'CN=Signer',
    certificateIssuer: 'CN=ICP-Brasil',
  },
});

const buildContext = () => {
  const childLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => childLogger),
  };
  return {
    teamId: 1,
    user: { id: 1, email: 'user@example.com', name: 'User' },
    session: { userId: 1 },
    logger,
    metadata: {},
    req: new Request('http://localhost'),
    res: new Response(),
  };
};

const callMutation = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  procedure: any,
  input: unknown,
  ctx: ReturnType<typeof buildContext>,
) => {
  return await procedure({
    ctx,
    input,
    path: 'envelope.item.uploadItiReport',
    type: 'mutation',
    signal: undefined,
    getRawInput: async () => input,
  });
};

const callQuery = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  procedure: any,
  input: unknown,
  ctx: ReturnType<typeof buildContext>,
) => {
  return await procedure({
    ctx,
    input,
    path: 'envelope.item.extractItiReport',
    type: 'query',
    signal: undefined,
    getRawInput: async () => input,
  });
};

describe('iti-report tRPC procedures', () => {
  beforeEach(() => {
    envelopeItemFindFirst.mockReset();
    envelopeItemUpdate.mockReset();
    createDocumentData.mockReset();
    assertValidPdf.mockReset();
    extractItiReportFields.mockReset();
    uploadItiReport.mockReset();
    mintSealedPdfToken.mockReset();

    assertValidPdf.mockResolvedValue(undefined);
    createDocumentData.mockResolvedValue({ id: 'doc-data-1' });
  });

  describe('uploadItiReport', () => {
    it('returns APPROVED and persists the EnvelopeItem fields when the hash matches', async () => {
      envelopeItemFindFirst.mockResolvedValue({
        id: 'item-1',
        sealedPdfSha256: SEALED_HASH,
        itiReportDocumentDataId: null,
      });
      envelopeItemUpdate.mockResolvedValue({ id: 'item-1' });

      uploadItiReport.mockImplementation(async (options: Record<string, unknown>) => {
        envelopeItemUpdate({
          where: { id: 'item-1' },
          data: {
            itiReportDocumentDataId: options.documentDataId,
            itiReportValidationStatus: 'APPROVED',
            itiReportValidatedHash: options.validatedHash,
            itiReportValidationDate: options.validationDate,
            itiReportUploadedAt: new Date(),
            itiReportSignatureCount: options.signatureCount,
            itiReportAnchoredSignatureCount: options.anchoredSignatureCount,
            itiReportCertificateSubject: options.certificateSubject,
            itiReportCertificateIssuer: options.certificateIssuer,
          },
          select: { id: true },
        });
        return {
          envelopeItemId: 'item-1',
          status: 'APPROVED',
          hashMatches: true,
        };
      });

      const { uploadItiReportRoute } = await import('./iti-report');
      const result = await callMutation(uploadItiReportRoute, buildValidInput(), buildContext());

      expect(result).toEqual({
        envelopeItemId: 'item-1',
        status: 'APPROVED',
        hashMatches: true,
      });
      expect(createDocumentData).toHaveBeenCalledTimes(1);
      expect(assertValidPdf).toHaveBeenCalledTimes(1);
      expect(uploadItiReport).toHaveBeenCalledTimes(1);
      expect(envelopeItemUpdate).toHaveBeenCalledTimes(1);
    });

    it('returns HASH_MISMATCH and persists the divergence on the EnvelopeItem', async () => {
      envelopeItemFindFirst.mockResolvedValue({
        id: 'item-1',
        sealedPdfSha256: SEALED_HASH,
        itiReportDocumentDataId: null,
      });
      envelopeItemUpdate.mockResolvedValue({ id: 'item-1' });

      uploadItiReport.mockImplementation(async (options: Record<string, unknown>) => {
        envelopeItemUpdate({
          where: { id: 'item-1' },
          data: {
            itiReportDocumentDataId: options.documentDataId,
            itiReportValidationStatus: 'HASH_MISMATCH',
            itiReportValidatedHash: options.validatedHash,
          },
          select: { id: true },
        });
        return {
          envelopeItemId: 'item-1',
          status: 'HASH_MISMATCH',
          hashMatches: false,
        };
      });

      const { uploadItiReportRoute } = await import('./iti-report');
      const result = await callMutation(
        uploadItiReportRoute,
        { ...buildValidInput(), data: { ...buildValidInput().data, validatedHash: MISMATCH_HASH } },
        buildContext(),
      );

      expect(result).toEqual({
        envelopeItemId: 'item-1',
        status: 'HASH_MISMATCH',
        hashMatches: false,
      });

      const updateCall = envelopeItemUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(updateCall.data.itiReportValidationStatus).toBe('HASH_MISMATCH');
      expect(updateCall.data.itiReportValidatedHash).toBe(MISMATCH_HASH);
    });

    it('rejects an empty PDF base64 string at the input schema before the route is invoked', async () => {
      const { uploadItiReportRoute } = await import('./iti-report');

      await expect(
        callMutation(
          uploadItiReportRoute,
          {
            ...buildValidInput(),
            data: { ...buildValidInput().data, file: { name: 'r.pdf', type: 'application/pdf', base64: '' } },
          },
          buildContext(),
        ),
      ).rejects.toBeTruthy();

      expect(envelopeItemFindFirst).not.toHaveBeenCalled();
      expect(uploadItiReport).not.toHaveBeenCalled();
      expect(assertValidPdf).not.toHaveBeenCalled();
    });
  });

  describe('extractItiReport', () => {
    it('forwards the base64 PDF to extractItiReportFields and returns its fields', async () => {
      extractItiReportFields.mockResolvedValue({
        validatedHash: SEALED_HASH,
        validationDate: new Date('2026-03-01T10:00:00.000Z'),
        status: 'APPROVED',
        signatureCount: 3,
        anchoredSignatureCount: 2,
        certificateSubject: 'CN=Signer',
        certificateIssuer: 'CN=ICP-Brasil',
      });

      const { extractItiReportRoute } = await import('./iti-report');
      const result = await callQuery(
        extractItiReportRoute,
        {
          envelopeId: 'envelope-1',
          envelopeItemId: 'item-1',
          file: { name: 'report.pdf', type: 'application/pdf', base64: baseFileBase64 },
        },
        buildContext(),
      );

      expect(extractItiReportFields).toHaveBeenCalledTimes(1);
      const passedBytes = extractItiReportFields.mock.calls[0]?.[0] as Uint8Array;
      expect(passedBytes).toBeInstanceOf(Uint8Array);
      expect(passedBytes.byteLength).toBeGreaterThan(0);

      expect(result).toEqual({
        fields: {
          validatedHash: SEALED_HASH,
          validationDate: new Date('2026-03-01T10:00:00.000Z'),
          status: 'APPROVED',
          signatureCount: 3,
          anchoredSignatureCount: 2,
          certificateSubject: 'CN=Signer',
          certificateIssuer: 'CN=ICP-Brasil',
        },
      });
    });
  });

  describe('mintSealedPdfToken', () => {
    it('returns the URL, raw token reference and expiry produced by mintSealedPdfToken', async () => {
      const expiresAt = new Date('2026-04-01T00:00:00.000Z');
      mintSealedPdfToken.mockResolvedValue({
        envelopeItemId: 'item-1',
        token: 'fresh-token-value',
        url: 'https://example.com/public/validation/envelope-1/document.pdf?token=fresh-token-value',
        expiresAt,
      });

      const { mintSealedPdfTokenRoute } = await import('./iti-report');
      const result = await callQuery(
        mintSealedPdfTokenRoute,
        { envelopeId: 'envelope-1', envelopeItemId: 'item-1' },
        buildContext(),
      );

      expect(mintSealedPdfToken).toHaveBeenCalledWith({
        envelopeId: 'envelope-1',
        envelopeItemId: 'item-1',
        teamId: 1,
        userId: 1,
      });
      expect(result).toEqual({
        envelopeItemId: 'item-1',
        url: 'https://example.com/public/validation/envelope-1/document.pdf?token=fresh-token-value',
        expiresAt,
      });
    });
  });
});
