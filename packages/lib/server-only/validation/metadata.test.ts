import { DocumentStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { buildPublicValidationMetadata } from './metadata';

const baseEnvelope = {
  id: 'env-123',
  status: DocumentStatus.COMPLETED,
  qrToken: 'qr-test-abc',
  completedAt: new Date('2026-06-09T12:00:00.000Z'),
};

const baseItem: Record<string, unknown> = {
  id: 'item-1',
  sealedPdfSha256: 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529',
  baseDocumentSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  sealedAt: new Date('2026-06-09T12:00:00.000Z'),
  sealedTimezone: 'America/Recife',
  sealingCertificateSubject: 'CN=Test Cert',
  sealingCertificateIssuer: 'CN=ICP-Brasil',
  sealingCertificateSerialNumber: '123456',
  pdfSignatureValidationStatus: 'VALID',
  icpBrasilChainValidationStatus: 'VALID',
  internalValidationStatus: 'APPROVED',
  sealedPdfPublicTokenHash: 'abccc',
  sealedPdfPublicUrlExpiresAt: new Date('2099-01-01'),
  itiReportValidationStatus: null,
  itiReportValidatedHash: null,
  itiReportValidationDate: null,
  itiReportSignatureCount: null,
  itiReportAnchoredSignatureCount: null,
};

describe('buildPublicValidationMetadata', () => {
  it('includes sealedPdfUrl when currentToken is valid', () => {
    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: baseItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
      currentToken: 'valid-token-value',
    });

    expect(result.sealedPdfUrl).toBeTruthy();
    expect(result.sealedPdfUrl).toContain('valid-token-value');
    expect(result.sealedPdfUrl).toContain('env-123');
  });

  it('omits sealedPdfUrl when currentToken is undefined', () => {
    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: baseItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
    });

    expect(result.sealedPdfUrl).toBeNull();
  });

  it('omits sealedPdfUrl when token is expired', () => {
    const expiredItem = {
      ...baseItem,
      sealedPdfPublicUrlExpiresAt: new Date('2020-01-01'),
    };

    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: expiredItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
      currentToken: 'some-token',
      now: new Date('2024-01-01'),
    });

    expect(result.sealedPdfUrl).toBeNull();
  });

  it('returns all expected fields with correct types', () => {
    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: baseItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
      currentToken: 'test-token',
    });

    expect(result.envelopeId).toBe('env-123');
    expect(result.documentStatus).toBe('COMPLETED');
    expect(result.baseDocumentSha256).toBe(baseItem.baseDocumentSha256);
    expect(result.sealedPdfSha256).toBe(baseItem.sealedPdfSha256);
    expect(result.signatureType).toBe('advanced_electronic_signature_with_icp_brasil_seal');
    expect(result.pdfSignatureValidationStatus).toBe('VALID');
    expect(result.icpBrasilChainValidationStatus).toBe('VALID');
    expect(result.certificateSubject).toBe('CN=Test Cert');
    expect(result.certificateIssuer).toBe('CN=ICP-Brasil');
    expect(result.certificateSerialNumber).toBe('123456');
  });

  it('serializes sealedAt as ISO string', () => {
    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: baseItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
    });

    expect(result.sealedAt).toBe('2026-06-09T12:00:00.000Z');
  });

  it('defaults timezone to America/Recife when sealedTimezone is null', () => {
    const itemNoTz = { ...baseItem, sealedTimezone: null };

    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: itemNoTz as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
    });

    expect(result.timezone).toBe('America/Recife');
  });

  it('sets itiReport to null when there is no report status', () => {
    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: baseItem as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
    });

    expect(result.itiReport).toBeNull();
  });

  it('includes itiReport details when report status is present', () => {
    const itemWithReport = {
      ...baseItem,
      itiReportValidationStatus: 'APPROVED',
      itiReportValidatedHash: 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529',
      itiReportValidationDate: new Date('2026-06-09T14:00:00.000Z'),
      itiReportSignatureCount: 2,
      itiReportAnchoredSignatureCount: 1,
    };

    const result = buildPublicValidationMetadata({
      envelope: baseEnvelope,
      item: itemWithReport as Parameters<typeof buildPublicValidationMetadata>[0]['item'],
    });

    expect(result.itiReport).not.toBeNull();
    expect(result.itiReport?.status).toBe('APPROVED');
    expect(result.itiReport?.validatedHash).toBe(itemWithReport.itiReportValidatedHash);
    expect(result.itiReport?.signatureCount).toBe(2);
    expect(result.itiReport?.anchoredSignatureCount).toBe(1);
  });
});
