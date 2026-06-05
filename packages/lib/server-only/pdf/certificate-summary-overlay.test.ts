import { describe, expect, it } from 'vitest';

import { getCertificateOverlayDrawCommands, getCertificateOverlayLines } from './certificate-summary-overlay';

describe('certificate summary overlay', () => {
  it('renders the hash on the second line', () => {
    const lines = getCertificateOverlayLines({
      pdfHash: 'abc123',
    });

    expect(lines).toEqual([
      'Assinado eletronicamente com assinatura eletrônica avançada — Lei nº 14.063/2020 e MP nº 2.200-2/2001',
      'Hash SHA-256: abc123',
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
        text: 'Linha 1',
        x: 15,
        y: 15,
        rotate: {
          angle: 90,
        },
      },
      {
        text: 'Linha 2',
        x: 25,
        y: 15,
        rotate: {
          angle: 90,
        },
      },
    ]);
  });

  it('keeps footer overlays centered while stacking the second line below the first', () => {
    const commands = getCertificateOverlayDrawCommands({
      position: 'FOOTER',
      pageWidth: 200,
      pageHeight: 300,
      lines: ['Linha principal', 'Hash SHA-256: abc123'],
      fontSize: 8,
      getTextWidth: (text) => text.length * 4,
    });

    expect(commands[0]?.y).toBeGreaterThan(commands[1]?.y ?? 0);
    expect(commands[0]?.x).toBe((200 - 'Linha principal'.length * 4) / 2);
    expect(commands[1]?.x).toBe((200 - 'Hash SHA-256: abc123'.length * 4) / 2);
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
        text: 'Linha 1',
        x: 562,
        y: 43,
        rotate: {
          angle: 270,
        },
      },
      {
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
