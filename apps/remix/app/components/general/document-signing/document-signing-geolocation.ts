export const GEOLOCATION_ERROR_CODE = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

type GeolocationApi = Pick<Geolocation, 'getCurrentPosition'>;

type GeolocationLike = {
  geolocation: GeolocationApi;
};

type GeolocationErrorLike = {
  code?: number;
};

const GEOLOCATION_HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
};

const GEOLOCATION_FALLBACK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20000,
  maximumAge: 300000,
};

const getGeolocationErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  return Number((error as GeolocationErrorLike).code);
};

const getCurrentPosition = (geolocation: GeolocationApi, options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, options);
  });

export const resolveGeolocation = async (navigatorLike: GeolocationLike) => {
  const primaryPosition = await getCurrentPosition(navigatorLike.geolocation, GEOLOCATION_HIGH_ACCURACY_OPTIONS).catch(
    (error) => ({ error }),
  );

  if ('coords' in primaryPosition) {
    return primaryPosition;
  }

  const primaryErrorCode = getGeolocationErrorCode(primaryPosition.error);

  if (
    primaryErrorCode !== GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE &&
    primaryErrorCode !== GEOLOCATION_ERROR_CODE.TIMEOUT
  ) {
    throw primaryPosition.error;
  }

  const fallbackPosition = await getCurrentPosition(navigatorLike.geolocation, GEOLOCATION_FALLBACK_OPTIONS).catch(
    (error) => ({ error }),
  );

  if ('coords' in fallbackPosition) {
    return fallbackPosition;
  }

  throw fallbackPosition.error;
};

export const getGeolocationErrorMessage = ({
  error,
  permissionState,
  isSecureContext = true,
}: {
  error: unknown;
  permissionState?: PermissionState;
  isSecureContext?: boolean;
}) => {
  if (!isSecureContext) {
    return 'Esta página não está em um contexto seguro (HTTPS). Acesse via HTTPS ou em localhost para permitir a geolocalização.';
  }

  const code = getGeolocationErrorCode(error);

  if (code === GEOLOCATION_ERROR_CODE.PERMISSION_DENIED || permissionState === 'denied') {
    return 'Precisamos da sua autorização de geolocalização para concluir a assinatura. Clique em Assinar novamente e escolha Permitir no navegador.';
  }

  if (code === GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE) {
    return 'Não foi possível determinar sua localização. Confirme que os serviços de localização do sistema estão ativados e que o navegador tem permissão de localização para este site, depois tente novamente.';
  }

  if (code === GEOLOCATION_ERROR_CODE.TIMEOUT) {
    return 'A geolocalização demorou mais do que o esperado. Confirme a permissão e tente novamente.';
  }

  return 'A geolocalização não pôde ser solicitada neste navegador. Verifique se a página está em HTTPS e se o navegador permite geolocalização, depois tente novamente.';
};

export const isBrowserSecureContext = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.isSecureContext;
};

export const getGeolocationPermissionState = async () => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return undefined;
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });

    return permissionStatus.state;
  } catch {
    return undefined;
  }
};
