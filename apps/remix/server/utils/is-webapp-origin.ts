import { NEXT_PUBLIC_WEBAPP_URL } from '@bchatsign/lib/constants/app';

export const isWebappOrigin = (origin: string | null | undefined) => {
  return origin === new URL(NEXT_PUBLIC_WEBAPP_URL()).origin;
};
