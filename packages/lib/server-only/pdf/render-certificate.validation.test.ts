import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) =>
    values.length === 0 ? String(strings) : String.raw({ raw: strings }, ...values),
}));

vi.mock('./helpers', () => ({
  ensureFontLibrary: () => undefined,
  parseFieldTypeFromPlaceholder: () => null,
  parseFieldMetaFromPlaceholder: () => null,
  findRecipientByPlaceholder: () => null,
}));

vi.mock('uqr', () => ({
  renderSVG: () => '<svg></svg>',
}));

vi.mock('../../utils/images/svg-to-png', () => ({
  svgToPng: () =>
    Promise.resolve(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    ),
}));

import { renderCertificate } from './render-certificate';

const basePayload = {
  envelopeId: 'envelope-123',
  qrToken: 'qr-123',
  hidePoweredBy: false,
  envelopeOwner: { name: 'Owner', email: 'owner@example.com' },
  pageWidth: 595.276,
  pageHeight: 841.89,
  baseDocumentSha256: 'a'.repeat(64),
  i18n: { _: (m: { message: string }) => m.message } as any,
  recipients: [
    {
      id: 1,
      name: 'Signer One',
      email: 'signer@example.com',
      role: 'SIGNER' as const,
      rejectionReason: null,
      signingStatus: 'SIGNED' as const,
      authLevel: 'Email',
      logs: {
        emailed: null,
        sent: null,
        opened: null,
        completed: null,
        rejected: null,
      },
    },
  ],
};

describe('renderCertificate validation block', () => {
  it('produces a non-empty PDF page list with the validation payload', async () => {
    const pages = await renderCertificate(basePayload);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0]?.byteLength).toBeGreaterThan(0);
  });
});
