import { EVIDENCE_TIME_ZONE } from '@documenso/lib/server-only/pdf/format-evidence-date-time';
import { VALIDAR_ITI_URL } from '@documenso/lib/server-only/validation';
import { Trans } from '@lingui/react/macro';
import type { EnvelopeItem } from '@prisma/client';
import { DateTime } from 'luxon';

export type DocumentValidationPanelProps = {
  envelopeItem: EnvelopeItem;
  /**
   * Whether to show the longhand signatory/email fields. Public anonymous
   * viewers should not see them; only authenticated parties with permission.
   */
  showSensitiveRecipients: boolean;
  /**
   * Pre-minted public URL (with token) for downloading the sealed PDF.
   * When null, the download button is disabled with a hint to mint first.
   */
  sealedPdfPublicUrl: string | null;
  /**
   * BchatSign public validation page URL (always present, points to the
   * `/share/:qrToken` page).
   */
  bchatValidationUrl: string;
  /**
   * Optional handler invoked when the user clicks the "Copy VALIDAR/ITI link"
   * or "Open VALIDAR/ITI" buttons. Lives outside the component to keep
   * this file free of `useToast` / `useLingui` plumbing.
   */
  onCopyItiLink?: () => void;
};

const formatSealedAt = (sealedAt: Date | null, timezone: string | null) => {
  if (!sealedAt) {
    return null;
  }

  const zone = timezone || EVIDENCE_TIME_ZONE;

  return {
    local: DateTime.fromJSDate(sealedAt).setZone(zone).toFormat("dd/MM/yyyy HH:mm:ss 'America/Recife'"),
    utc: DateTime.fromJSDate(sealedAt).toUTC().toISO(),
  };
};

export const DocumentValidationPanel = ({
  envelopeItem,
  sealedPdfPublicUrl,
  bchatValidationUrl,
}: DocumentValidationPanelProps) => {
  const sealedAt = formatSealedAt(envelopeItem.sealedAt, envelopeItem.sealedTimezone);
  const baseSha = envelopeItem.baseDocumentSha256;
  const itiStatus = envelopeItem.itiReportValidationStatus;

  return (
    <section className="mt-8 w-full rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <header className="mb-4 space-y-1">
        <h2 className="font-semibold text-lg">
          <Trans>Document Validation</Trans>
        </h2>
        <p className="text-muted-foreground text-sm">
          <Trans>
            This document can be validated through the VALIDAR/ITI service by uploading the sealed PDF, using a public
            URL or by scanning its QR Code. The final PDF was digitally sealed with an A1 ICP-Brasil certificate and its
            integrity can be verified through the SHA-256 hash below.
          </Trans>
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
        <Field
          label={<Trans>BchatSign validation link</Trans>}
          value={
            <a
              className="break-all text-primary underline"
              href={bchatValidationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {bchatValidationUrl}
            </a>
          }
        />

        <Field
          label={<Trans>Temporary public URL (sealed PDF)</Trans>}
          value={
            sealedPdfPublicUrl ? (
              <a
                className="break-all text-primary underline"
                href={sealedPdfPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {sealedPdfPublicUrl}
              </a>
            ) : (
              <span className="text-muted-foreground">
                <Trans>Generate a new temporary link from the document owner&apos;s account.</Trans>
              </span>
            )
          }
        />

        <Field
          label={<Trans>SHA-256 of the base document</Trans>}
          value={baseSha ? <code className="break-all text-xs">{baseSha}</code> : <DashValue />}
        />

        <Field
          label={<Trans>Internal validation status</Trans>}
          value={<StatusValue value={envelopeItem.internalValidationStatus} />}
        />

        <Field
          label={<Trans>Digital signature result</Trans>}
          value={<StatusValue value={envelopeItem.pdfSignatureValidationStatus} />}
        />

        <Field
          label={<Trans>ICP-Brasil chain status</Trans>}
          value={<StatusValue value={envelopeItem.icpBrasilChainValidationStatus} />}
        />

        <Field
          label={<Trans>Sealed at</Trans>}
          value={
            sealedAt ? (
              <span>
                {sealedAt.local}
                <span className="ml-2 text-muted-foreground text-xs">UTC: {sealedAt.utc}</span>
              </span>
            ) : (
              <DashValue />
            )
          }
        />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 font-medium text-sm hover:bg-muted"
          href={sealedPdfPublicUrl ?? '#'}
          aria-disabled={!sealedPdfPublicUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Trans>Download sealed PDF</Trans>
        </a>

        <a
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 font-medium text-sm hover:bg-muted"
          href={VALIDAR_ITI_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Trans>Open VALIDAR/ITI</Trans>
        </a>
      </div>

      <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <h3 className="font-medium">
          <Trans>VALIDAR/ITI official report</Trans>
        </h3>

        {!itiStatus ? (
          <p className="mt-1 text-muted-foreground">
            <Trans>
              Pending official report. This document can be validated manually on VALIDAR/ITI by uploading the final
              sealed PDF, using the public URL or the QR Code.
            </Trans>
          </p>
        ) : itiStatus === 'APPROVED' ? (
          <div className="mt-1 space-y-1">
            <p>
              <Trans>
                Approved on{' '}
                {envelopeItem.itiReportValidationDate
                  ? DateTime.fromJSDate(envelopeItem.itiReportValidationDate).toLocaleString(DateTime.DATETIME_MED)
                  : '—'}
                .
              </Trans>
            </p>
            <p>
              <Trans>Validated hash:</Trans>{' '}
              <code className="break-all text-xs">{envelopeItem.itiReportValidatedHash}</code>
            </p>
            <p>
              <Trans>Signature count:</Trans> {envelopeItem.itiReportSignatureCount ?? '—'}
            </p>
            <p>
              <Trans>Anchored signature count:</Trans> {envelopeItem.itiReportAnchoredSignatureCount ?? '—'}
            </p>
          </div>
        ) : itiStatus === 'HASH_MISMATCH' ? (
          <p className="mt-1 text-destructive">
            <Trans>
              Report attached with a hash mismatch. The hash validated in the report does not match the SHA-256 of the
              sealed PDF stored in this envelope.
            </Trans>
          </p>
        ) : itiStatus === 'REJECTED' ? (
          <p className="mt-1 text-destructive">
            <Trans>The official report declared the document as rejected by VALIDAR/ITI.</Trans>
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            <Trans>Awaiting submission of the official VALIDAR/ITI report.</Trans>
          </p>
        )}
      </div>
    </section>
  );
};

const Field = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div className="space-y-0.5">
    <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
    <dd className="text-sm">{value}</dd>
  </div>
);

const StatusValue = ({ value }: { value: string | null }) =>
  value ? <span className="font-mono text-xs">{value}</span> : <DashValue />;

const DashValue = () => <span className="text-muted-foreground">—</span>;
