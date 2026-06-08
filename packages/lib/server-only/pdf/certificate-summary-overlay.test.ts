import { describe, expect, it } from 'vitest';

import { getCertificateOverlayDrawCommands, getCertificateOverlayLines } from './certificate-summary-overlay';

describe('certificate summary overlay', () => {
  it('renders the three legal text lines', () => {
    const lines = getCertificateOverlayLines();

    expect(lines).toEqual([
      'Assinado eletronicamente com assinatura eletrônica avançada — Lei nº 14.063/2020 e MP nº 2.200-2/2001.',
      'Integridade verificável por Hash SHA-256, ID da assinatura, IP, dispositivo, data/hora e logs de auditoria.',
      'Documento final selado digitalmente com certificado A1 ICP-Brasil.',
    ]);
  });

  it('anchors left overlays to the left margin instead of page center', () => {
    const commands = getCertificateOverlayDrawCommands({
      position: 'LEFT',
      pageWidth: 595,
      pageHeight: 842,
      lines: ['Linha 1', 'Linha 2'],
      fontSize: 8,
      getTextWidth: (text) => text.length * 4,
    });

    expect(commands).toEqual([
      {
        kind: 'text',
        text: 'Linha 1',
        x: 15,
        y: 15,
        rotate: {
          angle: 90,
        },
      },
      {
        kind: 'text',
        text: 'Linha 2',
        x: 25,
        y: 15,
        rotate: {
          angle: 90,
        },
      },
    ]);
  });

  it('keeps footer overlays with text on left and qr on right when validation link is present', () => {
    const commands = getCertificateOverlayDrawCommands({
      position: 'FOOTER',
      pageWidth: 200,
      pageHeight: 300,
      lines: ['Linha principal', 'Hash SHA-256: abc123'],
      fontSize: 8,
      getTextWidth: (text) => text.length * 4,
      validationLink: 'https://example.com/verify/qr-token',
    });

    // First two commands should be text lines on the left
    expect(commands[0]).toMatchObject({ kind: 'text', text: 'Linha principal', x: 15, y: 15 });
    expect(commands[1]).toMatchObject({ kind: 'text', text: 'Hash SHA-256: abc123', x: 15, y: 25 });

    // Third command should be the QR code to the right of the text
    const qrCommand = commands[2];
    expect(qrCommand).toMatchObject({ kind: 'qr', size: 32 });
    expect((qrCommand as { kind: 'qr'; x: number; y: number; size: number }).x).toBeGreaterThan(15);

    // Fourth command should be the vertical label
    expect(commands[3]).toMatchObject({
      kind: 'vertical-label',
      text: 'BCHATSIGN',
      fontSize: 6,
    });
  });

  it('does not include qr commands when no validation link is provided', () => {
    const commands = getCertificateOverlayDrawCommands({
      position: 'FOOTER',
      pageWidth: 200,
      pageHeight: 300,
      lines: ['Linha principal', 'Hash SHA-256: abc123'],
      fontSize: 8,
      getTextWidth: (text) => text.length * 4,
    });

    // Only text commands
    expect(commands.every((cmd) => cmd.kind === 'text')).toBe(true);
  });

  it('anchors right overlays to the right margin instead of page center', () => {
    const commands = getCertificateOverlayDrawCommands({
      position: 'RIGHT',
      pageWidth: 595,
      pageHeight: 842,
      lines: ['Linha 1', 'Linha 2'],
      fontSize: 8,
      getTextWidth: (text) => text.length * 4,
    });

    expect(commands).toEqual([
      {
        kind: 'text',
        text: 'Linha 1',
        x: 562,
        y: 43,
        rotate: {
          angle: 270,
        },
      },
      {
        kind: 'text',
        text: 'Linha 2',
        x: 572,
        y: 43,
        rotate: {
          angle: 270,
        },
      },
    ]);
  });
});
