import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => String.raw({ raw: strings }, ...values),
}));

import { mapCompletedAuditLogToCertificateLog } from './generate-certificate-pdf';

describe('generate certificate pdf', () => {
  it('flattens geolocation from audit log data into the certificate payload', () => {
    const createdAt = new Date('2026-06-05T12:00:00.000Z');
    const completedAuditLog = {
      createdAt,
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
      data: {
        geolocation: {
          latitude: -5.7945,
          longitude: -35.211,
        },
      },
    } as Parameters<typeof mapCompletedAuditLogToCertificateLog>[0];

    const mappedLog = mapCompletedAuditLogToCertificateLog(completedAuditLog);

    expect(mappedLog).toEqual({
      createdAt,
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
      geolocation: {
        latitude: -5.7945,
        longitude: -35.211,
      },
    });
  });

  it('returns null when there is no completed audit log', () => {
    expect(mapCompletedAuditLogToCertificateLog(undefined)).toBeNull();
  });
});
