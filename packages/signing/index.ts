import { X509Certificate } from 'node:crypto';
import {
  NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER,
  NEXT_PUBLIC_SIGNING_CONTACT_INFO,
  NEXT_PUBLIC_WEBAPP_URL,
} from '@documenso/lib/constants/app';
import { env } from '@documenso/lib/utils/env';
import type { PDF, Signer, SignWarning } from '@libpdf/core';
import { match } from 'ts-pattern';

import { getTimestampAuthority } from './helpers/tsa';
import { createGoogleCloudSigner } from './transports/google-cloud';
import { createLocalSigner } from './transports/local';

export type SignOptions = {
  pdf: PDF;
};

export type SealingCertificateMetadata = {
  subject: string | null;
  issuer: string | null;
  serialNumber: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  signatureStatus: 'SIGNED' | 'SIGNED_WITH_WARNINGS';
  certificateChainStatus: 'COMPLETE' | 'INCOMPLETE' | 'NOT_PROVIDED' | 'UNKNOWN';
};

export type SignPdfResult = {
  bytes: Uint8Array;
  certificateMetadata: SealingCertificateMetadata;
};

let signer: Signer | null = null;

const parseCertificateDate = (value: string): Date | null => {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
};

const getCertificateChainStatus = (
  signer: Signer,
  warnings: SignWarning[],
): SealingCertificateMetadata['certificateChainStatus'] => {
  const hasChainWarning = warnings.some((warning) => warning.code === 'CHAIN_INCOMPLETE');

  if (hasChainWarning) {
    return 'INCOMPLETE';
  }

  if (signer.certificateChain && signer.certificateChain.length > 0) {
    return 'COMPLETE';
  }

  return 'NOT_PROVIDED';
};

const getSealingCertificateMetadata = (signer: Signer, warnings: SignWarning[]): SealingCertificateMetadata => {
  const signatureStatus = warnings.length > 0 ? 'SIGNED_WITH_WARNINGS' : 'SIGNED';

  try {
    const certificate = new X509Certificate(Buffer.from(signer.certificate));

    return {
      subject: certificate.subject,
      issuer: certificate.issuer,
      serialNumber: certificate.serialNumber,
      validFrom: parseCertificateDate(certificate.validFrom),
      validTo: parseCertificateDate(certificate.validTo),
      signatureStatus,
      certificateChainStatus: getCertificateChainStatus(signer, warnings),
    };
  } catch {
    return {
      subject: null,
      issuer: null,
      serialNumber: null,
      validFrom: null,
      validTo: null,
      signatureStatus,
      certificateChainStatus: 'UNKNOWN',
    };
  }
};

const getSigner = async () => {
  if (signer) {
    return signer;
  }

  const transport = env('NEXT_PRIVATE_SIGNING_TRANSPORT') || 'local';

  // eslint-disable-next-line require-atomic-updates
  signer = await match(transport)
    .with('local', async () => await createLocalSigner())
    .with('gcloud-hsm', async () => await createGoogleCloudSigner())
    .otherwise(() => {
      throw new Error(`Unsupported signing transport: ${transport}`);
    });

  return signer;
};

export const signPdf = async ({ pdf }: SignOptions): Promise<SignPdfResult> => {
  const signer = await getSigner();

  const tsa = getTimestampAuthority();

  const { bytes, warnings } = await pdf.sign({
    signer,
    reason: 'Signed by BchatSign',
    location: NEXT_PUBLIC_WEBAPP_URL(),
    contactInfo: NEXT_PUBLIC_SIGNING_CONTACT_INFO(),
    subFilter: NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER() ? 'adbe.pkcs7.detached' : 'ETSI.CAdES.detached',
    timestampAuthority: tsa ?? undefined,
    longTermValidation: !!tsa,
    archivalTimestamp: !!tsa,
  });

  return {
    bytes,
    certificateMetadata: getSealingCertificateMetadata(signer, warnings),
  };
};
