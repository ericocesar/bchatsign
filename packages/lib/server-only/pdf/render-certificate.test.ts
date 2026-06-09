import { setupI18n } from '@lingui/core';
import { RecipientRole, SigningStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { renderCertificate } from './render-certificate';

vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => String.raw({ raw: strings }, ...values),
}));

// Mock helpers to avoid missing font paths during testing
vi.mock('./helpers', () => ({
  ensureFontLibrary: vi.fn(),
  parseFieldTypeFromPlaceholder: vi.fn(),
  parseFieldMetaFromPlaceholder: vi.fn(),
  findRecipientByPlaceholder: vi.fn(),
}));

const i18nMock = setupI18n();
i18nMock.load('pt-BR', {});
i18nMock.activate('pt-BR');

const baseRecipients = [
  {
    id: 1,
    name: 'Signer One',
    email: 'signer@example.com',
    role: RecipientRole.SIGNER,
    rejectionReason: null,
    signingStatus: SigningStatus.SIGNED,
    authLevel: 'Email',
    logs: {
      emailed: {
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
      sent: {
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
      opened: {
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
      completed: {
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
      rejected: null,
    },
  },
];

describe('renderCertificate', () => {
  it('should render certificate without errors when hashes and geolocation are provided', async () => {
    const recipientsWithGeo = [
      {
        ...baseRecipients[0],
        logs: {
          ...baseRecipients[0].logs,
          completed: {
            ...baseRecipients[0].logs.completed,
            geolocation: {
              latitude: -23.55052,
              longitude: -46.633308,
            },
          },
        },
      },
    ];

    const payload = {
      envelopeId: 'envelope-123',
      qrToken: 'qr-123',
      hidePoweredBy: false,
      i18n: i18nMock,
      envelopeOwner: {
        name: 'Owner Name',
        email: 'owner@example.com',
      },
      pageWidth: 595.276,
      pageHeight: 841.89,
      baseDocumentSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      recipients: recipientsWithGeo,
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render certificate retrocompatibly when hashes and geolocation are omitted', async () => {
    const payload = {
      envelopeId: 'envelope-123',
      qrToken: 'qr-123',
      hidePoweredBy: false,
      i18n: i18nMock,
      envelopeOwner: {
        name: 'Owner Name',
        email: 'owner@example.com',
      },
      pageWidth: 595.276,
      pageHeight: 841.89,
      recipients: baseRecipients,
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render certificate with validation block when validation fields are present', async () => {
    const payload = {
      envelopeId: 'envelope-123',
      qrToken: 'qr-123',
      hidePoweredBy: false,
      i18n: i18nMock,
      envelopeOwner: {
        name: 'Owner Name',
        email: 'owner@example.com',
      },
      pageWidth: 595.276,
      pageHeight: 841.89,
      baseDocumentSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      pdfSignatureValidationStatus: 'VALID',
      icpBrasilChainValidationStatus: 'VALID',
      internalValidationStatus: 'APPROVED',
      sealedAt: new Date('2026-06-09T12:00:00.000Z'),
      sealedTimezone: 'America/Recife',
      recipients: baseRecipients,
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render certificate with HASH_MISMATCH itiReport without error', async () => {
    const payload = {
      envelopeId: 'envelope-123',
      qrToken: 'qr-123',
      hidePoweredBy: false,
      i18n: i18nMock,
      envelopeOwner: {
        name: 'Owner Name',
        email: 'owner@example.com',
      },
      pageWidth: 595.276,
      pageHeight: 841.89,
      baseDocumentSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      pdfSignatureValidationStatus: 'VALID',
      icpBrasilChainValidationStatus: 'VALID',
      internalValidationStatus: 'APPROVED',
      sealedAt: new Date('2026-06-09T12:00:00.000Z'),
      sealedTimezone: 'America/Recife',
      itiReport: {
        status: 'HASH_MISMATCH',
        validatedHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        validationDate: new Date('2026-06-09T14:00:00.000Z'),
        signatureCount: 2,
        anchoredSignatureCount: 1,
      },
      recipients: baseRecipients,
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});
