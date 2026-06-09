import { describe, expect, it } from 'vitest';

import {
  CONFIRMED_SEALED_PDF_SHA256,
  classifyItiReportHash,
  normalizeSha256,
} from './iti-report-hash';

describe('normalizeSha256', () => {
  it('lowercases the value', () => {
    expect(normalizeSha256('ABCDEF0123456789')).toBe('abcdef0123456789');
  });

  it('returns null for 0x-prefixed values (not in normal form)', () => {
    expect(normalizeSha256('0x' + 'a'.repeat(64))).toBeNull();
  });

  it('strips SHA256: prefix', () => {
    expect(normalizeSha256('sha256:' + 'a'.repeat(64))).toBe('a'.repeat(64));
  });

  it('strips whitespace', () => {
    expect(normalizeSha256('  ' + 'a'.repeat(64) + '  ')).toBe('a'.repeat(64));
  });

  it('returns null for null/undefined/empty', () => {
    expect(normalizeSha256(null)).toBeNull();
    expect(normalizeSha256(undefined)).toBeNull();
  });

  it('returns null for non-hex strings', () => {
    expect(normalizeSha256('zzzz')).toBeNull();
  });
});

describe('classifyItiReportHash', () => {
  const sealedSha = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';

  it('returns APPROVED when validatedHash matches sealedPdfSha256', () => {
    const result = classifyItiReportHash({
      validatedHash: sealedSha,
      sealedPdfSha256: sealedSha,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.hashMatches).toBe(true);
  });

  it('returns HASH_MISMATCH when hashes differ', () => {
    const result = classifyItiReportHash({
      validatedHash: 'b'.repeat(64),
      sealedPdfSha256: sealedSha,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('HASH_MISMATCH');
    expect(result.hashMatches).toBe(false);
  });

  it('returns HASH_MISMATCH when validatedHash cannot be normalized', () => {
    const result = classifyItiReportHash({
      validatedHash: '',
      sealedPdfSha256: sealedSha,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('HASH_MISMATCH');
  });

  it('returns HASH_MISMATCH even when reportStatus says APPROVED but hash differs', () => {
    const result = classifyItiReportHash({
      validatedHash: 'b'.repeat(64),
      sealedPdfSha256: sealedSha,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('HASH_MISMATCH');
  });

  it('returns REJECTED when reportStatus is REJECTED', () => {
    const result = classifyItiReportHash({
      validatedHash: sealedSha,
      sealedPdfSha256: sealedSha,
      reportStatus: 'REJECTED',
    });

    expect(result.status).toBe('REJECTED');
    expect(result.hashMatches).toBe(false);
  });

  it('handles case-insensitive reportStatus', () => {
    const result = classifyItiReportHash({
      validatedHash: sealedSha,
      sealedPdfSha256: sealedSha,
      reportStatus: 'rejected',
    });

    expect(result.status).toBe('REJECTED');
  });

  it('returns PENDING when sealedPdfSha256 is missing', () => {
    const result = classifyItiReportHash({
      validatedHash: sealedSha,
      sealedPdfSha256: null,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('PENDING');
    expect(result.hashMatches).toBe(false);
  });

  it('returns PENDING when sealedPdfSha256 is undefined', () => {
    const result = classifyItiReportHash({
      validatedHash: sealedSha,
      sealedPdfSha256: undefined,
      reportStatus: 'APPROVED',
    });

    expect(result.status).toBe('PENDING');
  });
});

describe('CONFIRMED_SEALED_PDF_SHA256', () => {
  it('matches the known hash from the plan', () => {
    expect(CONFIRMED_SEALED_PDF_SHA256).toBe(
      'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529',
    );
  });
});
