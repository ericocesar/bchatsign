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

describe('renderCertificate', () => {
  it('should render certificate without errors when hashes and geolocation are provided', async () => {
    const i18nMock = setupI18n();
    i18nMock.load('pt-BR', {});
    i18nMock.activate('pt-BR');

    const payload = {
      envelopeId: 'envelope-123',
      qrToken: 'qr-123',
      hidePoweredBy: false,
      i18n: i18nMock,
      envelopeOwner: {
        name: 'Owner Name',
        email: 'owner@example.com',
      },
      pageWidth: 595.276, // A4 dimensions
      pageHeight: 841.89,
      baseDocumentSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sealedPdfSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      recipients: [
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
              geolocation: {
                latitude: -23.55052,
                longitude: -46.633308,
              },
            },
            rejected: null,
          },
        },
      ],
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render certificate retrocompatibly when hashes and geolocation are omitted', async () => {
    const i18nMock = setupI18n();
    i18nMock.load('pt-BR', {});
    i18nMock.activate('pt-BR');

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
      recipients: [
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
      ],
    };

    const result = await renderCertificate(payload);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});
