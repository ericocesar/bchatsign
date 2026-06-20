import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type OverlayCandidate = {
  relativePath: string;
  absolutePath: string;
  exists: boolean;
  source: string;
};

const overlayCandidates: OverlayCandidate[] = (
  [
    'apps/remix/app/components/general/document/certificate-summary-overlay.tsx',
    'packages/lib/server-only/pdf/certificate-summary-overlay.ts',
  ] as const
).map((relativePath) => {
  const absolutePath = resolve(__dirname, '..', '..', '..', '..', relativePath);
  let source = '';
  let exists = false;
  try {
    source = readFileSync(absolutePath, 'utf-8');
    exists = true;
  } catch {
    exists = false;
  }
  return { relativePath, absolutePath, exists, source };
});

const existingOverlays = overlayCandidates.filter((c) => c.exists);

describe('certificate overlay (overlay-no-hash)', () => {
  it('discovers at least one certificate summary overlay module in the repo', () => {
    expect(existingOverlays.length).toBeGreaterThan(0);
  });

  for (const candidate of existingOverlays) {
    describe(`overlay at ${candidate.relativePath}`, () => {
      it('does not contain baseDocumentSha256 as a source token', () => {
        expect(candidate.source).not.toContain('baseDocumentSha256');
      });

      it('does not contain sealedPdfSha256 as a source token', () => {
        expect(candidate.source).not.toContain('sealedPdfSha256');
      });

      it('does not include any 64-char hex hash literal placeholder', () => {
        expect(candidate.source).not.toMatch(/[0-9a-fA-F]{64}/);
      });
    });
  }
});
