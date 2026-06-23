import { ItiReportValidationStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const envelopeItemFindFirst = vi.hoisted(() => vi.fn());
const envelopeItemUpdate = vi.hoisted(() => vi.fn());

vi.mock('@bchatsign/prisma', () => ({
  prisma: {
    envelopeItem: {
      findFirst: envelopeItemFindFirst,
      update: envelopeItemUpdate,
    },
  },
}));

import { uploadItiReport } from './iti-report-upload';

const SEALED_HASH = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';
const MISMATCH_HASH = 'b5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55528';

const baseOptions = {
  envelopeId: 'envelope-1',
  envelopeItemId: 'item-1',
  teamId: 1,
  userId: 1,
  pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
  pdfName: 'report.pdf',
  validatedHash: SEALED_HASH,
  validationDate: new Date('2026-03-01T10:00:00.000Z'),
  reportStatus: 'APPROVED',
  signatureCount: 3,
  anchoredSignatureCount: 2,
  certificateSubject: 'CN=Signer',
  certificateIssuer: 'CN=ICP-Brasil',
  documentDataId: 'doc-data-1',
};

describe('uploadItiReport', () => {
  beforeEach(() => {
    envelopeItemFindFirst.mockReset();
    envelopeItemUpdate.mockReset();
  });

  it('returns APPROVED and persists the EnvelopeItem fields when the hash matches', async () => {
    envelopeItemFindFirst.mockResolvedValue({
      id: 'item-1',
      sealedPdfSha256: SEALED_HASH,
      itiReportDocumentDataId: null,
    });

    envelopeItemUpdate.mockResolvedValue({ id: 'item-1' });

    const result = await uploadItiReport(baseOptions);

    expect(result).toEqual({
      envelopeItemId: 'item-1',
      status: ItiReportValidationStatus.APPROVED,
      hashMatches: true,
    });

    expect(envelopeItemUpdate).toHaveBeenCalledTimes(1);

    const updateCall = envelopeItemUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall.data.itiReportDocumentDataId).toBe('doc-data-1');
    expect(updateCall.data.itiReportValidationStatus).toBe(ItiReportValidationStatus.APPROVED);
    expect(updateCall.data.itiReportValidatedHash).toBe(SEALED_HASH);
    expect(updateCall.data.itiReportSignatureCount).toBe(3);
    expect(updateCall.data.itiReportAnchoredSignatureCount).toBe(2);
    expect(updateCall.data.itiReportCertificateSubject).toBe('CN=Signer');
    expect(updateCall.data.itiReportCertificateIssuer).toBe('CN=ICP-Brasil');
    expect(updateCall.data.itiReportValidationDate).toEqual(new Date('2026-03-01T10:00:00.000Z'));
    expect(updateCall.data.itiReportUploadedAt).toBeInstanceOf(Date);
  });

  it('returns HASH_MISMATCH when the report hash does not match sealedPdfSha256', async () => {
    envelopeItemFindFirst.mockResolvedValue({
      id: 'item-1',
      sealedPdfSha256: SEALED_HASH,
      itiReportDocumentDataId: null,
    });

    envelopeItemUpdate.mockResolvedValue({ id: 'item-1' });

    const result = await uploadItiReport({
      ...baseOptions,
      validatedHash: MISMATCH_HASH,
    });

    expect(result.status).toBe(ItiReportValidationStatus.HASH_MISMATCH);
    expect(result.hashMatches).toBe(false);

    const updateCall = envelopeItemUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall.data.itiReportValidationStatus).toBe(ItiReportValidationStatus.HASH_MISMATCH);
  });

  it('returns REJECTED when the report status is rejected (overrides hash equality)', async () => {
    envelopeItemFindFirst.mockResolvedValue({
      id: 'item-1',
      sealedPdfSha256: SEALED_HASH,
      itiReportDocumentDataId: null,
    });

    envelopeItemUpdate.mockResolvedValue({ id: 'item-1' });

    const result = await uploadItiReport({
      ...baseOptions,
      reportStatus: 'REJECTED',
    });

    expect(result.status).toBe(ItiReportValidationStatus.REJECTED);
    expect(result.hashMatches).toBe(false);
  });

  it('throws when the envelope item cannot be found for this team', async () => {
    envelopeItemFindFirst.mockResolvedValue(null);

    await expect(uploadItiReport(baseOptions)).rejects.toThrow(/Envelope item not found/i);
    expect(envelopeItemUpdate).not.toHaveBeenCalled();
  });

  it('throws when the envelope item has not been sealed yet', async () => {
    envelopeItemFindFirst.mockResolvedValue({
      id: 'item-1',
      sealedPdfSha256: null,
      itiReportDocumentDataId: null,
    });

    await expect(uploadItiReport(baseOptions)).rejects.toThrow(/no sealed PDF/i);
    expect(envelopeItemUpdate).not.toHaveBeenCalled();
  });

  it('throws when the report PDF is empty', async () => {
    envelopeItemFindFirst.mockResolvedValue({
      id: 'item-1',
      sealedPdfSha256: SEALED_HASH,
      itiReportDocumentDataId: null,
    });

    await expect(
      uploadItiReport({
        ...baseOptions,
        pdfBytes: new Uint8Array(0),
      }),
    ).rejects.toThrow(/Report PDF is empty/i);
    expect(envelopeItemUpdate).not.toHaveBeenCalled();
  });
});
