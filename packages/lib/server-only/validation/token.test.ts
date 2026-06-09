import { describe, expect, it } from 'vitest';

import {
  generateSealedPdfToken,
  hashSealedPdfToken,
  isTokenExpired,
  safeTokenEqual,
  truncateTokenHashForLog,
} from './token';

describe('generateSealedPdfToken', () => {
  it('returns a base64url string of expected length', () => {
    const { token, tokenHash } = generateSealedPdfToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('never returns the same value twice', () => {
    const a = generateSealedPdfToken();
    const b = generateSealedPdfToken();

    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe('hashSealedPdfToken', () => {
  it('returns a deterministic SHA-512 hex string (128 chars)', () => {
    const hash = hashSealedPdfToken('test-token-value');

    expect(hash).toMatch(/^[0-9a-f]{128}$/i);

    const hash2 = hashSealedPdfToken('test-token-value');
    expect(hash2).toBe(hash);
  });
});

describe('safeTokenEqual', () => {
  it('returns true for matching hashes', () => {
    const hash = hashSealedPdfToken('some-token');

    expect(safeTokenEqual(hash, hash)).toBe(true);
  });

  it('returns false for different hashes', () => {
    const hashA = hashSealedPdfToken('token-a');
    const hashB = hashSealedPdfToken('token-b');

    expect(safeTokenEqual(hashA, hashB)).toBe(false);
  });

  it('returns false when one hash is empty', () => {
    const hash = hashSealedPdfToken('some-token');

    expect(safeTokenEqual('', hash)).toBe(false);
    expect(safeTokenEqual(hash, '')).toBe(false);
  });
});

describe('isTokenExpired', () => {
  it('returns true for null expiresAt', () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it('returns true for undefined expiresAt', () => {
    expect(isTokenExpired(undefined)).toBe(true);
  });

  it('returns true for a past date', () => {
    const past = new Date('2020-01-01');

    expect(isTokenExpired(past, new Date('2024-01-01'))).toBe(true);
  });

  it('returns false for a future date', () => {
    const future = new Date('2099-01-01');

    expect(isTokenExpired(future, new Date('2024-01-01'))).toBe(false);
  });

  it('returns true for current date (boundary)', () => {
    const now = new Date();

    expect(isTokenExpired(now, now)).toBe(true);
  });
});

describe('truncateTokenHashForLog', () => {
  it('truncates long hashes to 6+4 chars', () => {
    const fullHash = 'a'.repeat(128);
    const truncated = truncateTokenHashForLog(fullHash);

    expect(truncated).toBe('aaaaaa…aaaa');
    expect(truncated.length).toBeLessThan(fullHash.length);
  });

  it('returns the original string for very short inputs', () => {
    expect(truncateTokenHashForLog('short')).toBe('short');
  });

  it('never includes the raw token text', () => {
    const { token, tokenHash } = generateSealedPdfToken();
    const truncated = truncateTokenHashForLog(tokenHash);

    expect(token).not.toContain(truncated);
    expect(truncated).not.toContain(token);
  });
});
