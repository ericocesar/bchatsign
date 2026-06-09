import { DateTime } from 'luxon';

import { APP_I18N_OPTIONS } from '../../constants/i18n';

export const EVIDENCE_TIME_ZONE = 'America/Recife';

export const formatEvidenceDateTime = (date: Date): string => {
  const localDateTime = DateTime.fromJSDate(date).setZone(EVIDENCE_TIME_ZONE).setLocale(APP_I18N_OPTIONS.defaultLocale);
  const utcDateTime = DateTime.fromJSDate(date).toUTC();

  return `${localDateTime.toFormat("dd/MM/yyyy 'às' HH:mm:ss")} — ${EVIDENCE_TIME_ZONE} | UTC: ${utcDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`;
};
