import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const overlayFilePath = path.resolve(
  __dirname,
  'certificate-summary-overlay.ts',
);

const overlaySource = readFileSync(overlayFilePath, 'utf-8');

describe('certificate-summary-overlay hash exclusion', () => {
  it('does not contain baseDocumentSha256 outside of comments', () => {
    const lines = overlaySource.split('\n');
    const codeLines = lines.filter(
      (l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'),
    );

    for (const line of codeLines) {
      expect(line).not.toMatch(/baseDocumentSha256/);
    }
  });

  it('does not contain sealedPdfSha256 outside of comments', () => {
    const lines = overlaySource.split('\n');
    const codeLines = lines.filter(
      (l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'),
    );

    for (const line of codeLines) {
      expect(line).not.toMatch(/sealedPdfSha256/);
    }
  });

  it('does not contain the phrase hash or SHA-256 in rendered strings', () => {
    const lines = overlaySource.split('\n');
    const codeLines = lines.filter(
      (l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'),
    );

    for (const line of codeLines) {
      const match = line.match(/(['"`]).*?(hash|sha-?256).*?\1/i);
      if (match) {
        throw new Error(
          `Overlay line contains hash reference in a string: "${line.trim()}"`,
        );
      }
    }
  });
});
