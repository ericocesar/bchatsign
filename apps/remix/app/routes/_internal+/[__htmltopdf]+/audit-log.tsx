import { DOCUMENT_STATUS } from '@bchatsign/lib/constants/document';
import { APP_I18N_OPTIONS, ZSupportedLanguageCodeSchema } from '@bchatsign/lib/constants/i18n';
import { RECIPIENT_ROLES_DESCRIPTION } from '@bchatsign/lib/constants/recipient-roles';
import { unsafeGetEntireEnvelope } from '@bchatsign/lib/server-only/admin/get-entire-document';
import { decryptSecondaryData } from '@bchatsign/lib/server-only/crypto/decrypt';
import { findDocumentAuditLogs } from '@bchatsign/lib/server-only/document/find-document-audit-logs';
import { getOrganisationClaimByTeamId } from '@bchatsign/lib/server-only/organisation/get-organisation-claims';
import { formatDocumentAuditLogAction } from '@bchatsign/lib/utils/document-audit-logs';
import { mapSecondaryIdToDocumentId } from '@bchatsign/lib/utils/envelope';
import { getTranslations } from '@bchatsign/lib/utils/i18n';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { EnvelopeType } from '@bchatsign/prisma/generated/types';
import { DateTime } from 'luxon';
import { redirect } from 'react-router';
import { UAParser } from 'ua-parser-js';

import { BrandingLogo } from '~/components/general/branding-logo';

import type { Route } from './+types/audit-log';
import auditLogStylesheet from './audit-log.print.css?url';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: auditLogStylesheet }];

const EVIDENCE_TIME_ZONE = 'America/Recife';

const formatLocalDateTime = (date: Date) => {
  return DateTime.fromJSDate(date)
    .setZone(EVIDENCE_TIME_ZONE)
    .setLocale(APP_I18N_OPTIONS.defaultLocale)
    .toFormat("dd/MM/yyyy 'às' HH:mm:ss");
};

const formatUtcDateTime = (date: Date) => {
  return DateTime.fromJSDate(date).toUTC().toFormat("yyyy-MM-dd HH:mm:ss 'UTC'");
};

export async function loader({ request }: Route.LoaderArgs) {
  const d = new URL(request.url).searchParams.get('d');

  if (typeof d !== 'string' || !d) {
    throw redirect('/');
  }

  const rawDocumentId = decryptSecondaryData(d);

  if (!rawDocumentId || isNaN(Number(rawDocumentId))) {
    throw redirect('/');
  }

  const documentId = Number(rawDocumentId);

  const envelope = await unsafeGetEntireEnvelope({
    id: {
      type: 'documentId',
      id: documentId,
    },
    type: EnvelopeType.DOCUMENT,
  }).catch(() => null);

  if (!envelope) {
    throw redirect('/');
  }

  const organisationClaim = await getOrganisationClaimByTeamId({ teamId: envelope.teamId });

  const documentLanguage = ZSupportedLanguageCodeSchema.parse(envelope.documentMeta?.language);

  const { data: auditLogs } = await findDocumentAuditLogs({
    documentId: documentId,
    userId: envelope.userId,
    teamId: envelope.teamId,
    perPage: 100_000,
  });

  const messages = await getTranslations(documentLanguage);

  return {
    auditLogs,
    document: {
      id: mapSecondaryIdToDocumentId(envelope.secondaryId),
      title: envelope.title,
      status: envelope.status,
      envelopeId: envelope.id,
      user: {
        name: envelope.user.name,
        email: envelope.user.email,
      },
      recipients: envelope.recipients,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
      deletedAt: envelope.deletedAt,
      documentMeta: envelope.documentMeta,
    },
    hidePoweredBy: organisationClaim.flags.hidePoweredBy,
    documentLanguage,
    messages,
  };
}

/**
 * DO NOT USE TRANS. YOU MUST USE _ FOR THIS FILE AND ALL CHILDREN COMPONENTS.
 *
 * Cannot use dynamicActivate by itself to translate this specific page and all
 * children components because `not-found.tsx` page runs and overrides the i18n.
 *
 * Update: Maybe <Trans> tags work now after RR7 migration.
 */
export default function AuditLog({ loaderData }: Route.ComponentProps) {
  const { auditLogs, document, documentLanguage, hidePoweredBy, messages } = loaderData;

  const { i18n, _ } = useLingui();

  i18n.loadAndActivate({ locale: documentLanguage, messages });

  const parser = new UAParser();

  return (
    <section className="audit-page">
      <header className="audit-header">
        <div>
          <small>{_(msg`Envelope ID`)}</small>
          <strong>{document.envelopeId}</strong>
        </div>

        <h1>{_(msg`Audit Log`)}</h1>
      </header>

      <section className="audit-summary">
        <div>
          <span>{_(msg`Status`)}</span>
          <strong>
            {_(document.deletedAt ? msg`Deleted` : DOCUMENT_STATUS[document.status].description).toUpperCase()}
          </strong>
        </div>

        <div>
          <span>{_(msg`Time Zone`)}</span>
          <strong>{document.documentMeta?.timezone ?? 'N/A'}</strong>
        </div>

        <div>
          <span>{_(msg`Created At`)}</span>
          <strong>{formatLocalDateTime(document.createdAt)}</strong>
          <small>{formatUtcDateTime(document.createdAt)}</small>
        </div>

        <div>
          <span>{_(msg`Last Updated`)}</span>
          <strong>{formatLocalDateTime(document.updatedAt)}</strong>
          <small>{formatUtcDateTime(document.updatedAt)}</small>
        </div>

        <div className="wide">
          <span>{_(msg`Enclosed Documents`)}</span>
          <strong>{document.title}</strong>
        </div>

        <div className="wide">
          <span>{_(msg`Recipients`)}</span>
          <strong>
            {document.recipients.map((recipient, i) => (
              <span key={recipient.id}>
                {i > 0 && <br />}[{_(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}] {recipient.name} (
                {recipient.email})
              </span>
            ))}
          </strong>
        </div>
      </section>

      <section className="audit-events">
        {auditLogs.map((log) => {
          parser.setUA(log.userAgent || '');
          const formattedAction = formatDocumentAuditLogAction(i18n, log);
          const userAgentInfo = parser.getResult();

          const browser = userAgentInfo.browser.name;
          const version = userAgentInfo.browser.version;
          const os = userAgentInfo.os.name;

          const userAgentFormatted =
            browser && os ? `${version ? `${browser} ${version}` : browser} em ${os}` : log.userAgent || 'N/A';

          return (
            <article key={log.id} className="audit-card">
              <h2>{log.type.replace(/_/g, ' ')}</h2>
              <p>{formattedAction.description}</p>
              <time>{formatLocalDateTime(log.createdAt)}</time>
              <small>{formatUtcDateTime(log.createdAt)}</small>
              <dl>
                <div>
                  <dt>{_(msg`User`)}</dt>
                  <dd>{log.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt>{_(msg`IP`)}</dt>
                  <dd>{log.ipAddress || 'N/A'}</dd>
                </div>
                <div>
                  <dt>{_(msg`Agent`)}</dt>
                  <dd>{userAgentFormatted}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      {!hidePoweredBy && (
        <div className="audit-branding">
          <BrandingLogo className="max-h-6" />
        </div>
      )}
    </section>
  );
}
