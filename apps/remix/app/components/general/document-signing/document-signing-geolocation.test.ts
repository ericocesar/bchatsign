import { describe, expect, it, vi } from 'vitest';

import { GEOLOCATION_ERROR_CODE, getGeolocationErrorMessage, resolveGeolocation } from './document-signing-geolocation';

describe('document signing geolocation', () => {
  it('retries with fallback accuracy when the primary lookup cannot determine the position', async () => {
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_success: PositionCallback, error: PositionErrorCallback) => {
        error?.({ code: GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE } as GeolocationPositionError);
      })
      .mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: -5.7945,
            longitude: -35.211,
          },
        } as GeolocationPosition);
      });

    const position = await resolveGeolocation({
      geolocation: {
        getCurrentPosition,
      },
    });

    expect(position.coords.latitude).toBe(-5.7945);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition.mock.calls[0]?.[2]).toMatchObject({
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    });
    expect(getCurrentPosition.mock.calls[1]?.[2]).toMatchObject({
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 300000,
    });
  });

  it('does not retry when the user denies permission', async () => {
    const permissionDeniedError = { code: GEOLOCATION_ERROR_CODE.PERMISSION_DENIED } as GeolocationPositionError;

    const getCurrentPosition = vi
      .fn()
      .mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
        error?.(permissionDeniedError);
      });

    await expect(
      resolveGeolocation({
        geolocation: {
          getCurrentPosition,
        },
      }),
    ).rejects.toBe(permissionDeniedError);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('maps position unavailable errors to a location services message', () => {
    const message = getGeolocationErrorMessage({
      error: { code: GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE },
    });

    expect(message).toContain('serviços de localização do sistema');
  });

  it('returns a secure-context message when the page is not in a secure context', () => {
    const message = getGeolocationErrorMessage({
      error: { code: GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE },
      isSecureContext: false,
    });

    expect(message).toContain('contexto seguro');
    expect(message).toContain('HTTPS');
  });

  it('treats errors without a numeric code as a generic geolocation failure', () => {
    const message = getGeolocationErrorMessage({
      error: { name: 'SecurityError' },
    });

    expect(message).toContain('HTTPS');
    expect(message).not.toContain('autorização de geolocalização');
  });
});
