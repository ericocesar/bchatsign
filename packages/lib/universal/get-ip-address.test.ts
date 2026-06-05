import { describe, expect, it } from 'vitest';

import { getIpAddress } from './get-ip-address';

describe('getIpAddress', () => {
  it('prefers the standard Forwarded header', () => {
    const request = new Request('https://example.com', {
      headers: {
        forwarded: 'for=203.0.113.10;proto=https;by=203.0.113.20',
        'x-forwarded-for': '198.51.100.1',
      },
    });

    expect(getIpAddress(request)).toBe('203.0.113.10');
  });

  it('falls back to the first x-forwarded-for value', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      },
    });

    expect(getIpAddress(request)).toBe('198.51.100.1');
  });

  it('uses loopback when running on localhost without proxy headers', () => {
    const request = new Request('http://localhost:3000');

    expect(getIpAddress(request)).toBe('127.0.0.1');
  });
});
