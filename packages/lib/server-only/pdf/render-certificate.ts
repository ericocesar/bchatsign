import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Field, RecipientRole, Signature } from '@prisma/client';
import { SigningStatus } from '@prisma/client';
import Konva from 'konva';
import 'konva/skia-backend';
import type { Canvas } from 'skia-canvas';
import { Image as SkiaImage } from 'skia-canvas';
import { UAParser } from 'ua-parser-js';
import { renderSVG } from 'uqr';

import { NEXT_PUBLIC_WEBAPP_URL } from '../../constants/app';
import { RECIPIENT_ROLE_SIGNING_REASONS, RECIPIENT_ROLES_DESCRIPTION } from '../../constants/recipient-roles';
import type { TDocumentAuditLogBaseSchema } from '../../types/document-audit-logs';
import { svgToPng } from '../../utils/images/svg-to-png';
import { formatEvidenceDateTime } from './format-evidence-date-time';
import { ensureFontLibrary } from './helpers';

type ColumnWidths = [number, number];

type BaseAuditLog = Pick<TDocumentAuditLogBaseSchema, 'createdAt' | 'ipAddress' | 'userAgent'>;

export type CertificateRecipient = {
  id: number;
  name: string;
  email: string;
  role: RecipientRole;
  rejectionReason: string | null;
  signingStatus: SigningStatus;
  signatureField?: Pick<Field, 'id' | 'secondaryId' | 'recipientId'> & {
    signature?: Pick<Signature, 'signatureImageAsBase64' | 'typedSignature'> | null;
  };
  authLevel: string;
  logs: {
    emailed: BaseAuditLog | null;
    sent: BaseAuditLog | null;
    opened: BaseAuditLog | null;
    completed:
      | (BaseAuditLog & {
          geolocation?: {
            address?: string | null;
            latitude: number;
            longitude: number;
          } | null;
        })
      | null;
    rejected: BaseAuditLog | null;
  };
};

type GenerateCertificateOptions = {
  recipients: CertificateRecipient[];
  envelopeId: string;
  qrToken: string | null;
  hidePoweredBy: boolean;
  i18n: I18n;
  envelopeOwner: {
    name: string;
    email: string;
  };
  pageWidth: number;
  pageHeight: number;
  baseDocumentSha256?: string;
  sealedPdfSha256?: string;
  sealedAt?: Date | null;
  sealedTimezone?: string | null;
  pdfSignatureValidationStatus?: string | null;
  icpBrasilChainValidationStatus?: string | null;
  internalValidationStatus?: string | null;
  itiReport?: {
    status: string | null;
    validatedHash: string | null;
    validationDate: Date | null;
    signatureCount: number | null;
    anchoredSignatureCount: number | null;
  } | null;
};

// Helper function to get device info from user agent
const getDevice = (userAgent?: string | null): string => {
  if (!userAgent) {
    return 'Unknown';
  }

  const parser = new UAParser(userAgent);

  parser.setUA(userAgent);

  const result = parser.getResult();

  return `${result.os.name} - ${result.browser.name} ${result.browser.version}`;
};

const textMutedForegroundLight = '#000000';
const textMutedForeground = '#000000';
const textRejectedRed = '#000000';
const textBase = 10;
const textSm = 9;
const textXs = 8;
const fontMedium = '500';
const certificateFontFamily = 'Inter Latin 200';

const columnWidthPercentages = [50, 50];
const rowPadding = 12;
const tableHeaderHeight = 38;
const pageTopMargin = 72;
const pageBottomMargin = 24;
const contentMaxWidth = 768;

const titleFontSize = 18;

type RenderLabelAndTextOptions = {
  label: string;
  text: string;
  width: number;
  y?: number;
  labelFill?: string;
  valueFill?: string;
};

const renderLabelAndText = (options: RenderLabelAndTextOptions) => {
  const { width, y } = options;

  const group = new Konva.Group({
    y,
  });

  const labelFill = options.labelFill ?? textMutedForeground;
  const valueFill = options.valueFill ?? textMutedForeground;

  const label = new Konva.Text({
    x: 0,
    y: 0,
    text: `${options.label}: `,
    fontStyle: fontMedium,
    fontFamily: certificateFontFamily,
    fill: labelFill,
    fontSize: textSm,
  });

  group.add(label);

  const value = new Konva.Text({
    x: label.width(),
    y: 0,
    width: width - label.width(),
    fontFamily: certificateFontFamily,
    text: options.text,
    fill: valueFill,
    wrap: 'char',
    fontSize: textSm,
  });

  group.add(value);

  return group;
};

type RenderRowHeaderOptions = {
  columnWidths: number[];
  i18n: I18n;
};

const renderRowHeader = (options: RenderRowHeaderOptions) => {
  const { columnWidths, i18n } = options;

  const columnOneWidth = columnWidths[0];
  const columnTwoWidth = columnWidths[1];

  const headerRow = new Konva.Group();

  const headerFontStyling = {
    fontFamily: certificateFontFamily,
    fontSize: 11,
    fontStyle: fontMedium,
    verticalAlign: 'middle',
    fill: textMutedForeground,
    height: tableHeaderHeight,
  };

  const header1 = new Konva.Text({
    x: rowPadding,
    width: columnOneWidth,
    text: i18n._(msg`Signer Events`),
    ...headerFontStyling,
  });
  headerRow.add(header1);

  const header2 = new Konva.Text({
    x: columnOneWidth + rowPadding,
    width: columnTwoWidth,
    text: i18n._(msg`Signature`),
    ...headerFontStyling,
  });
  headerRow.add(header2);

  return headerRow;
};

const columnPadding = 10;

type RenderColumnOptions = {
  recipient: CertificateRecipient;
  width: number;
  i18n: I18n;
  envelopeOwner: {
    name: string;
    email: string;
  };
  baseDocumentSha256?: string;
  sealedPdfSha256?: string;
};

const renderColumnOne = (options: RenderColumnOptions) => {
  const { recipient, width, i18n } = options;

  const columnGroup = new Konva.Group();

  const textSectionPadding = 8;

  const textFontStyling = {
    x: 0,
    fontFamily: certificateFontFamily,
    wrap: 'char',
    lineHeight: 1.2,
    fill: textMutedForeground,
    width: width - columnPadding,
  };

  if (recipient.name) {
    const nameText = new Konva.Text({
      y: 0,
      text: recipient.name,
      fontSize: textBase,
      ...textFontStyling,
      fontStyle: fontMedium,
    });

    columnGroup.add(nameText);
  }

  const emailText = new Konva.Text({
    y: columnGroup.getClientRect().height,
    text: recipient.email,
    fontSize: textBase,
    ...textFontStyling,
  });

  columnGroup.add(emailText);

  const roleText = new Konva.Text({
    y: columnGroup.getClientRect().height + textSectionPadding,
    text: i18n._(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName),
    fontSize: textSm,
    ...textFontStyling,
  });
  columnGroup.add(roleText);

  const authLabel = new Konva.Text({
    y: columnGroup.getClientRect().height + textSectionPadding,
    text: `${i18n._(msg`Authentication Level`)}:`,
    fontSize: textSm,
    fontStyle: fontMedium,
    ...textFontStyling,
  });
  columnGroup.add(authLabel);

  const authValue = new Konva.Text({
    y: columnGroup.getClientRect().height,
    text: recipient.authLevel,
    fontSize: textSm,
    ...textFontStyling,
  });
  columnGroup.add(authValue);

  const sigSectionText = new Konva.Text({
    y: columnGroup.getClientRect().height + textSectionPadding,
    text: 'Assinatura eletrônica avançada do signatário',
    fontSize: textSm,
    fontStyle: fontMedium,
    ...textFontStyling,
  });
  columnGroup.add(sigSectionText);

  const baseLegalText = new Konva.Text({
    y: columnGroup.getClientRect().height + textSectionPadding,
    text: 'Base legal: Lei nº 14.063/2020 e art. 10, §2º, da MP nº 2.200-2/2001',
    fontSize: textSm,
    ...textFontStyling,
  });
  columnGroup.add(baseLegalText);

  return columnGroup;
};

const renderColumnTwo = (options: RenderColumnOptions) => {
  const { recipient, width, i18n } = options;
  const { baseDocumentSha256, sealedPdfSha256 } = options;

  const column = new Konva.Group();

  const columnWidth = width - columnPadding;

  const isRejected = Boolean(recipient.logs.rejected);

  if (recipient.signatureField?.secondaryId) {
    // Signature container with green border
    const signatureContainer = new Konva.Group({ x: 0, y: 0 });

    const minSignatureHeight = 40;
    const maxSignatureWidth = 100;

    // Signature content
    if (recipient.signatureField?.signature?.signatureImageAsBase64) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const img = new SkiaImage(
        recipient.signatureField?.signature?.signatureImageAsBase64,
      ) as unknown as HTMLImageElement;

      const signatureImage = new Konva.Image({
        image: img,
        x: 4,
        y: 4,
        width: maxSignatureWidth,
        height: maxSignatureWidth * (img.height / img.width),
      });

      signatureContainer.add(signatureImage);
    } else if (recipient.signatureField?.signature?.typedSignature) {
      const typedSig = new Konva.Text({
        x: 2,
        text: recipient.signatureField?.signature?.typedSignature,
        padding: 4,
        fontFamily: 'Caveat',
        fontSize: 16,
        align: 'center',
        verticalAlign: 'middle',
        width: maxSignatureWidth,
      });

      if (typedSig.getClientRect().height < minSignatureHeight) {
        typedSig.setAttrs({
          height: minSignatureHeight,
        });
      }

      signatureContainer.add(typedSig);
    }

    // Do not add the signature container for rejected recipients.
    if (!isRejected) {
      column.add(signatureContainer);
    }

    const signatureHeight = Math.max(signatureContainer.getClientRect().height, minSignatureHeight);

    const signatureBorder = new Konva.Rect({
      x: 2,
      y: 2,
      width: maxSignatureWidth,
      height: signatureHeight,
      stroke: 'rgba(122, 196, 85, 0.6)',
      strokeWidth: 1,
      cornerRadius: 8,
    });
    signatureContainer.add(signatureBorder);

    const signatureShadow = new Konva.Rect({
      x: 0,
      y: 0,
      width: maxSignatureWidth + 4,
      height: signatureHeight + 4,
      stroke: 'rgba(122, 196, 85, 0.1)',
      strokeWidth: 4,
      cornerRadius: 8,
    });
    signatureContainer.add(signatureShadow);

    // Documento final selado digitalmente com certificado A1 ICP-Brasil
    const sealLabel = new Konva.Text({
      x: 0,
      y: isRejected ? 0 : signatureHeight + 10,
      text: 'Documento final selado digitalmente com certificado A1 ICP-Brasil',
      fill: textMutedForeground,
      width: columnWidth,
      fontFamily: certificateFontFamily,
      fontSize: textSm,
      fontStyle: fontMedium,
      lineHeight: 1.4,
    });
    column.add(sealLabel);

    // Finalidade do selo
    const purposeField = renderLabelAndText({
      label: 'Finalidade do selo',
      text: 'garantir integridade, autenticidade técnica e verificabilidade do documento eletrônico.',
      width,
      y: column.getClientRect().height + 6,
    });
    column.add(purposeField);

    if (baseDocumentSha256) {
      const hashField = renderLabelAndText({
        label: 'Hash SHA-256 do documento base',
        text: baseDocumentSha256,
        width,
        y: column.getClientRect().height + 6,
      });
      column.add(hashField);
    }

    if (sealedPdfSha256) {
      const hashField = renderLabelAndText({
        label: 'Hash SHA-256 do PDF final lacrado',
        text: sealedPdfSha256,
        width,
        y: column.getClientRect().height + 6,
      });
      column.add(hashField);
    }

    // ID da assinatura
    const sigIdLabel = new Konva.Text({
      x: 0,
      y: column.getClientRect().height + 6,
      text: 'ID da assinatura:',
      fill: textMutedForeground,
      width: columnWidth,
      fontFamily: certificateFontFamily,
      fontSize: textSm,
      fontStyle: fontMedium,
      lineHeight: 1.4,
    });
    column.add(sigIdLabel);

    const sigIdValue = new Konva.Text({
      x: 0,
      y: column.getClientRect().height,
      text: recipient.signatureField.secondaryId.toUpperCase(),
      fill: textMutedForeground,
      fontFamily: certificateFontFamily,
      fontSize: textSm,
      width: columnWidth,
      wrap: 'char',
    });
    column.add(sigIdValue);
  } else {
    const naText = new Konva.Text({
      x: 0,
      y: 0,
      text: 'N/A',
      fill: textMutedForeground,
      fontFamily: certificateFontFamily,
      fontSize: textSm,
    });
    column.add(naText);

    // Still show seal info even without signature
    const sealLabel = new Konva.Text({
      x: 0,
      y: column.getClientRect().height + 6,
      text: 'Documento final selado digitalmente com certificado A1 ICP-Brasil',
      fill: textMutedForeground,
      width: columnWidth,
      fontFamily: certificateFontFamily,
      fontSize: textSm,
      fontStyle: fontMedium,
      lineHeight: 1.4,
    });
    column.add(sealLabel);

    const purposeField = renderLabelAndText({
      label: 'Finalidade do selo',
      text: 'garantir integridade, autenticidade técnica e verificabilidade do documento eletrônico.',
      width,
      y: column.getClientRect().height + 6,
    });
    column.add(purposeField);

    if (baseDocumentSha256) {
      const hashField = renderLabelAndText({
        label: 'Hash SHA-256 do documento base',
        text: baseDocumentSha256,
        width,
        y: column.getClientRect().height + 6,
      });
      column.add(hashField);
    }

    if (sealedPdfSha256) {
      const hashField = renderLabelAndText({
        label: 'Hash SHA-256 do PDF final lacrado',
        text: sealedPdfSha256,
        width,
        y: column.getClientRect().height + 6,
      });
      column.add(hashField);
    }
  }

  const relevantLog = isRejected ? recipient.logs.rejected : recipient.logs.completed;

  const ipLabelAndText = renderLabelAndText({
    label: 'Endereço IP registrado',
    text: relevantLog?.ipAddress ?? i18n._(msg`Unknown`),
    width,
    y: column.getClientRect().height + 6,
  });
  column.add(ipLabelAndText);

  const deviceLabelAndText = renderLabelAndText({
    label: 'Dispositivo',
    text: getDevice(relevantLog?.userAgent),
    width,
    y: column.getClientRect().height + 6,
  });
  column.add(deviceLabelAndText);

  if (!isRejected && recipient.logs.completed?.geolocation) {
    const geo = recipient.logs.completed.geolocation;
    const coords = `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;
    const address = geo.address?.trim();

    const geoGroup = new Konva.Group({
      y: column.getClientRect().height + 6,
    });

    const geoCoordText = new Konva.Text({
      x: 0,
      y: 0,
      text: `Geolocalização registrada: ${coords}`,
      fontStyle: fontMedium,
      fontFamily: certificateFontFamily,
      fill: textMutedForeground,
      fontSize: textSm,
      width,
      wrap: 'char',
    });
    geoGroup.add(geoCoordText);

    if (address) {
      const addressText = new Konva.Text({
        x: 0,
        y: geoGroup.getClientRect().height + 2,
        text: `Endereço aproximado: ${address}`,
        fontFamily: certificateFontFamily,
        fill: textMutedForeground,
        fontSize: textSm,
        width,
        wrap: 'char',
      });
      geoGroup.add(addressText);
    }

    const precisionText = new Konva.Text({
      x: 0,
      y: geoGroup.getClientRect().height + 2,
      text: 'Precisão: obtida pelo navegador do signatário mediante consentimento.',
      fontFamily: certificateFontFamily,
      fill: textMutedForeground,
      fontSize: textSm,
      width,
      wrap: 'char',
    });
    geoGroup.add(precisionText);

    column.add(geoGroup);
  }

  return column;
};

const renderColumnThree = (options: RenderColumnOptions) => {
  const { recipient, width, i18n, envelopeOwner } = options;

  const column = new Konva.Group();

  type DetailItem = {
    label: string;
    value: string;
    labelFill?: string;
    valueFill?: string;
  };

  const itemsToRender: DetailItem[] = [
    {
      label: 'Enviado em',
      value: recipient.logs.emailed
        ? formatEvidenceDateTime(recipient.logs.emailed.createdAt)
        : recipient.logs.sent
          ? formatEvidenceDateTime(recipient.logs.sent.createdAt)
          : i18n._(msg`Unknown`),
    },
    {
      label: 'Visualizado em',
      value: recipient.logs.opened ? formatEvidenceDateTime(recipient.logs.opened.createdAt) : i18n._(msg`Unknown`),
    },
  ];

  if (recipient.logs.rejected) {
    itemsToRender.push({
      label: 'Rejeitado em',
      value: formatEvidenceDateTime(recipient.logs.rejected.createdAt),
      labelFill: textRejectedRed,
      valueFill: textRejectedRed,
    });
  } else {
    itemsToRender.push({
      label: 'Assinado em',
      value: recipient.logs.completed
        ? formatEvidenceDateTime(recipient.logs.completed.createdAt)
        : i18n._(msg`Unknown`),
    });
  }

  const isOwner = recipient.email.toLowerCase() === envelopeOwner.email.toLowerCase();

  itemsToRender.push({
    label: 'Motivo',
    value:
      recipient.signingStatus === SigningStatus.REJECTED
        ? recipient.rejectionReason || ''
        : isOwner
          ? i18n._(msg`I am the owner of this document`)
          : i18n._(RECIPIENT_ROLE_SIGNING_REASONS[recipient.role]),
  });

  for (const [index, item] of itemsToRender.entries()) {
    const labelAndText = renderLabelAndText({
      label: item.label,
      text: item.value,
      width,
      y: column.getClientRect().height + (index === 0 ? 0 : 8),
      labelFill: item.labelFill,
      valueFill: item.valueFill,
    });
    column.add(labelAndText);
  }

  return column;
};

type RenderRowOptions = {
  recipient: CertificateRecipient;
  columnWidths: ColumnWidths;
  i18n: I18n;
  envelopeOwner: {
    name: string;
    email: string;
  };
  baseDocumentSha256?: string;
  sealedPdfSha256?: string;
};

const renderDetailsSection = (options: RenderColumnOptions) => {
  const { width } = options;

  const detailsGroup = new Konva.Group();

  const detailsLabel = new Konva.Text({
    x: 0,
    y: 0,
    text: 'Detalhes',
    fill: textMutedForeground,
    fontFamily: certificateFontFamily,
    fontSize: textSm,
    fontStyle: fontMedium,
    width: width - columnPadding,
  });
  detailsGroup.add(detailsLabel);

  const detailsContent = renderColumnThree(options);
  detailsContent.setAttrs({
    x: 0,
    y: detailsGroup.getClientRect().height + 6,
  } satisfies Partial<Konva.GroupConfig>);
  detailsGroup.add(detailsContent);

  return detailsGroup;
};

const renderRow = (options: RenderRowOptions) => {
  const { recipient, columnWidths, i18n, envelopeOwner, baseDocumentSha256, sealedPdfSha256 } = options;

  const rowGroup = new Konva.Group();

  const width = columnWidths[0] + columnWidths[1];

  // Draw top border line.
  const borderLine = new Konva.Line({
    points: [0, 0, width + rowPadding * 2, 0],
    stroke: '#e5e7eb',
    strokeWidth: 1,
  });

  rowGroup.add(borderLine);

  // Column 1: Signer Events
  const columnGroup = renderColumnOne({
    recipient,
    width: columnWidths[0],
    i18n,
    envelopeOwner,
    baseDocumentSha256,
    sealedPdfSha256,
  });
  columnGroup.setAttrs({
    x: rowPadding,
    y: rowPadding,
  } satisfies Partial<Konva.GroupConfig>);
  rowGroup.add(columnGroup);

  const columnTwoGroup = renderColumnTwo({
    recipient,
    width: columnWidths[1],
    i18n,
    envelopeOwner,
    baseDocumentSha256,
    sealedPdfSha256,
  });
  columnTwoGroup.setAttrs({
    x: rowPadding + columnWidths[0],
    y: rowPadding,
  } satisfies Partial<Konva.GroupConfig>);
  rowGroup.add(columnTwoGroup);

  const detailsGroup = renderDetailsSection({
    recipient,
    width: width,
    i18n,
    envelopeOwner,
    baseDocumentSha256,
    sealedPdfSha256,
  });
  detailsGroup.setAttrs({
    x: rowPadding,
    y: rowPadding + Math.max(columnGroup.getClientRect().height, columnTwoGroup.getClientRect().height) + 12,
  } satisfies Partial<Konva.GroupConfig>);
  rowGroup.add(detailsGroup);

  const rowBottomPadding = new Konva.Rect({
    x: 0,
    y: rowGroup.getClientRect().height,
    width: rowGroup.getClientRect().width,
    height: rowPadding,
  });
  rowGroup.add(rowBottomPadding);

  return rowGroup;
};

const renderBranding = async ({ qrToken }: { qrToken: string | null }) => {
  const branding = new Konva.Group();
  const validationLink = qrToken ? `${NEXT_PUBLIC_WEBAPP_URL()}/share/${qrToken}` : null;
  const validationLinkWidth = 180;

  const text = new Konva.Text({
    x: 0,
    text: 'Certificado de assinatura fornecido por BchatSign.\nDocumento final selado digitalmente com certificado A1 emitido no âmbito da ICP-Brasil.',
    fontFamily: certificateFontFamily,
    fontSize: textSm,
    width: validationLinkWidth + (qrToken ? 72 : 0),
    wrap: 'char',
    lineHeight: 1.4,
    fill: textMutedForeground,
  });

  const qrSize = qrToken ? 72 : 0;
  const qrSection = new Konva.Group({ x: 0, y: 0 });

  if (validationLink) {
    const qrSvg = renderSVG(validationLink, {
      ecc: 'Q',
    });

    const svgImage = await svgToPng(qrSvg);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const qrSkiaImage = new SkiaImage(svgImage) as unknown as HTMLImageElement;
    const qrImage = new Konva.Image({
      image: qrSkiaImage,
      height: qrSize,
      width: qrSize,
      x: validationLinkWidth - qrSize,
      y: 0,
    });

    const validationLabel = new Konva.Text({
      x: 0,
      y: qrSize + 8,
      text: 'Link de validação:',
      width: validationLinkWidth,
      align: 'right',
      fontFamily: certificateFontFamily,
      fontSize: textSm,
      fontStyle: fontMedium,
      fill: textMutedForeground,
    });

    const validationValue = new Konva.Text({
      x: 0,
      y: qrSize + 22,
      text: validationLink,
      width: validationLinkWidth,
      align: 'right',
      fontFamily: certificateFontFamily,
      fontSize: textXs,
      fill: textMutedForeground,
      wrap: 'char',
      lineHeight: 1.2,
    });

    qrSection.add(qrImage);
    qrSection.add(validationLabel);
    qrSection.add(validationValue);
    branding.add(qrSection);
  }

  const logoGroup = new Konva.Group({
    y: qrSection.getClientRect().height > 0 ? qrSection.getClientRect().height + 16 : 0,
  });
  logoGroup.add(text);

  branding.add(logoGroup);

  return branding;
};

type RenderValidationBlockOptions = {
  i18n: I18n;
  envelopeId: string;
  qrToken: string | null;
  width: number;
  baseDocumentSha256?: string | null;
  sealedPdfSha256?: string | null;
  sealedAt?: Date | null;
  sealedTimezone?: string | null;
  pdfSignatureValidationStatus?: string | null;
  icpBrasilChainValidationStatus?: string | null;
  internalValidationStatus?: string | null;
  itiReport?: {
    status: string | null;
    validatedHash: string | null;
    validationDate: Date | null;
    signatureCount: number | null;
    anchoredSignatureCount: number | null;
  } | null;
};

const formatCertificateDate = (date: Date | null | undefined, timezone: string | null | undefined) => {
  if (!date) {
    return null;
  }

  const zone = timezone ?? 'America/Recife';
  const local = `${formatEvidenceDateTime(date)} (${zone})`;
  const utc = date.toISOString();

  return `${local} (UTC: ${utc})`;
};

const renderValidationBlock = (options: RenderValidationBlockOptions) => {
  const {
    envelopeId,
    qrToken,
    width,
    baseDocumentSha256,
    sealedPdfSha256,
    sealedAt,
    sealedTimezone,
    pdfSignatureValidationStatus,
    icpBrasilChainValidationStatus,
    internalValidationStatus,
    itiReport,
  } = options;

  const group = new Konva.Group();

  const title = new Konva.Text({
    x: 0,
    y: 0,
    text: 'Validação do Documento',
    fontFamily: certificateFontFamily,
    fontSize: titleFontSize,
    fontStyle: fontMedium,
    fill: textMutedForeground,
  });
  group.add(title);

  const intro = new Konva.Text({
    x: 0,
    y: title.height() + 6,
    text:
      'Este documento pode ser validado no serviço VALIDAR/ITI por upload do arquivo PDF, URL pública ou QR Code. ' +
      'O PDF final foi selado digitalmente com certificado A1 ICP-Brasil, e sua integridade pode ser conferida ' +
      'pelo hash SHA-256 do PDF final lacrado.',
    fontFamily: certificateFontFamily,
    fontSize: textSm,
    fill: textMutedForeground,
    width,
    wrap: 'char',
    lineHeight: 1.4,
  });
  group.add(intro);

  let cursorY = intro.y() + intro.height() + 12;

  const linkText = qrToken ? `${NEXT_PUBLIC_WEBAPP_URL()}/share/${qrToken}` : '—';

  const labelAndTextRows: Array<{ label: string; value: string }> = [
    { label: 'Link de validação BchatSign', value: linkText },
    {
      label: 'Link público temporário do PDF final lacrado',
      value: `${NEXT_PUBLIC_WEBAPP_URL()}/public/validation/${envelopeId}/document.pdf?token=…`,
    },
    { label: 'Hash SHA-256 do documento base', value: baseDocumentSha256 ?? '—' },
    { label: 'Hash SHA-256 do PDF final lacrado', value: sealedPdfSha256 ?? '—' },
    { label: 'Status da validação interna', value: internalValidationStatus ?? '—' },
    { label: 'Resultado da assinatura digital', value: pdfSignatureValidationStatus ?? '—' },
    { label: 'Status da cadeia ICP-Brasil', value: icpBrasilChainValidationStatus ?? '—' },
    {
      label: 'Data/hora do lacre',
      value: formatCertificateDate(sealedAt ?? null, sealedTimezone ?? null) ?? '—',
    },
  ];

  for (const row of labelAndTextRows) {
    const item = renderLabelAndText({
      label: row.label,
      text: row.value,
      width,
      y: cursorY,
    });
    group.add(item);
    cursorY += item.getClientRect().height + 4;
  }

  cursorY += 8;

  const reportTitle = new Konva.Text({
    x: 0,
    y: cursorY,
    text: 'Validação VALIDAR/ITI:',
    fontFamily: certificateFontFamily,
    fontSize: textBase,
    fontStyle: fontMedium,
    fill: textMutedForeground,
  });
  group.add(reportTitle);
  cursorY += reportTitle.height() + 4;

  let reportMessage: string;

  if (!itiReport || !itiReport.status) {
    reportMessage =
      'Pendente de relatório oficial. Este documento pode ser validado manualmente no VALIDAR/ITI ' +
      'por upload do PDF final lacrado, URL pública ou QR Code.';
  } else if (itiReport.status === 'APPROVED') {
    const date = itiReport.validationDate
      ? `${formatEvidenceDateTime(itiReport.validationDate)} (${sealedTimezone ?? 'America/Recife'})`
      : '—';
    reportMessage =
      `Aprovada em ${date}.\n` +
      `Hash validado: ${itiReport.validatedHash ?? '—'}\n` +
      `Quantidade de assinaturas: ${itiReport.signatureCount ?? '—'}\n` +
      `Quantidade de assinaturas ancoradas: ${itiReport.anchoredSignatureCount ?? '—'}`;
  } else if (itiReport.status === 'HASH_MISMATCH') {
    reportMessage =
      'Relatório anexado com divergência de hash. O hash validado no relatório não corresponde ' +
      'ao hash SHA-256 do PDF final lacrado armazenado neste envelope.';
  } else if (itiReport.status === 'REJECTED') {
    reportMessage = 'O relatório oficial do VALIDAR/ITI declarou o documento como rejeitado.';
  } else {
    reportMessage = 'Aguardando submissão do relatório oficial do VALIDAR/ITI.';
  }

  const reportText = new Konva.Text({
    x: 0,
    y: cursorY,
    text: reportMessage,
    fontFamily: certificateFontFamily,
    fontSize: textSm,
    fill:
      itiReport?.status === 'HASH_MISMATCH' || itiReport?.status === 'REJECTED' ? textRejectedRed : textMutedForeground,
    width,
    wrap: 'char',
    lineHeight: 1.4,
  });
  group.add(reportText);
  cursorY += reportText.height() + 8;

  const legal = new Konva.Text({
    x: 0,
    y: cursorY,
    text:
      'Este documento foi assinado eletronicamente com assinatura eletrônica avançada, nos termos ' +
      'da Lei nº 14.063/2020 e do art. 10, §2º, da MP nº 2.200-2/2001.\n' +
      'O documento final foi selado digitalmente com certificado A1 emitido no âmbito da ICP-Brasil ' +
      'para preservação de integridade, autenticidade técnica e verificabilidade do arquivo.\n' +
      'A validação pode ser realizada no BchatSign por meio do link ou QR Code abaixo. Também é ' +
      'possível validar o PDF final lacrado no serviço VALIDAR/ITI, por upload do arquivo, URL ' +
      'pública ou QR Code.',
    fontFamily: certificateFontFamily,
    fontSize: textXs,
    fill: textMutedForeground,
    width,
    wrap: 'char',
    lineHeight: 1.4,
  });
  group.add(legal);

  return group;
};

type GroupRowsIntoPagesOptions = {
  recipients: CertificateRecipient[];
  maxHeight: number;
  i18n: I18n;
  columnWidths: ColumnWidths;
  envelopeOwner: {
    name: string;
    email: string;
  };
  baseDocumentSha256?: string;
  sealedPdfSha256?: string;
};

const groupRowsIntoPages = (options: GroupRowsIntoPagesOptions) => {
  const { recipients, maxHeight, i18n, columnWidths, envelopeOwner, baseDocumentSha256, sealedPdfSha256 } = options;

  const rowHeader = renderRowHeader({ columnWidths, i18n });
  const rowHeaderHeight = rowHeader.getClientRect().height;

  const groupedRows: Konva.Group[][] = [[]];

  let availablePageHeight = maxHeight - rowHeaderHeight;
  let currentGroupedRowIndex = 0;

  // Group rows into pages.
  for (const recipient of recipients) {
    const row = renderRow({
      recipient,
      columnWidths,
      i18n,
      envelopeOwner,
      baseDocumentSha256,
      sealedPdfSha256,
    });

    const rowHeight = row.getClientRect().height;

    if (rowHeight > availablePageHeight) {
      currentGroupedRowIndex++;
      groupedRows[currentGroupedRowIndex] = [row];
      availablePageHeight = maxHeight - rowHeaderHeight;
    } else {
      groupedRows[currentGroupedRowIndex].push(row);
    }

    // Reduce available height by the row height.
    availablePageHeight -= rowHeight;
  }

  return groupedRows;
};

type RenderTablesOptions = {
  groupedRows: Konva.Group[][];
  columnWidths: ColumnWidths;
  i18n: I18n;
};

const renderTables = (options: RenderTablesOptions) => {
  const { groupedRows, columnWidths, i18n } = options;

  const tables: Konva.Group[] = [];

  // Render the rows for each page.
  for (const rows of groupedRows) {
    const table = new Konva.Group();
    const tableHeader = renderRowHeader({ columnWidths, i18n });

    table.add(tableHeader);

    for (const row of rows) {
      row.setAttrs({
        x: 0,
        y: table.getClientRect().height,
      } satisfies Partial<Konva.GroupConfig>);

      table.add(row);
    }

    // Add table background and border.
    const tableClientRect = table.getClientRect();
    const cardRect = new Konva.Rect({
      x: tableClientRect.x,
      y: tableClientRect.y,
      width: tableClientRect.width,
      height: tableClientRect.height,
      stroke: '#e5e7eb',
      strokeWidth: 1.5,
      cornerRadius: 8,
    });
    table.add(cardRect);

    tables.push(table);
  }

  return tables;
};

export async function renderCertificate({
  recipients,
  envelopeId,
  qrToken,
  hidePoweredBy,
  i18n,
  envelopeOwner,
  pageWidth,
  pageHeight,
  baseDocumentSha256,
  sealedPdfSha256,
  sealedAt,
  sealedTimezone,
  pdfSignatureValidationStatus,
  icpBrasilChainValidationStatus,
  internalValidationStatus,
  itiReport,
}: GenerateCertificateOptions) {
  ensureFontLibrary();

  const minimumMargin = 10;

  const tableWidth = Math.min(pageWidth - minimumMargin * 2, contentMaxWidth);
  const tableContentWidth = tableWidth - rowPadding * 2;
  const margin = (pageWidth - tableWidth) / 2;

  const columnOneWidth = (tableContentWidth * columnWidthPercentages[0]) / 100;
  const columnTwoWidth = (tableContentWidth * columnWidthPercentages[1]) / 100;
  const columnWidths: ColumnWidths = [columnOneWidth, columnTwoWidth];

  // Helper to render a Konva stage to a PNG buffer
  let stage: Konva.Stage | null = new Konva.Stage({ width: pageWidth, height: pageHeight });

  const maxTableHeight = pageHeight - pageTopMargin - pageBottomMargin;

  const groupedRows = groupRowsIntoPages({
    recipients,
    maxHeight: maxTableHeight,
    columnWidths,
    i18n,
    envelopeOwner,
    baseDocumentSha256,
    sealedPdfSha256,
  });

  const tables = renderTables({ groupedRows, columnWidths, i18n });

  const brandingGroup = await renderBranding({ qrToken });
  const brandingRect = brandingGroup.getClientRect();
  const brandingTopPadding = 24;

  const pages: Uint8Array[] = [];

  let isQrPlaced = false;

  // Add a table to each page.
  for (const [index, table] of tables.entries()) {
    stage.destroyChildren();
    const page = new Konva.Layer();

    const group = new Konva.Group();

    const titleText = new Konva.Text({
      x: margin,
      y: 0,
      height: pageTopMargin,
      verticalAlign: 'middle',
      text: i18n._(msg`Signing Certificate`),
      fontFamily: certificateFontFamily,
      fontSize: titleFontSize,
      fontStyle: '700',
    });

    group.add(titleText);

    // Add legal paragraph below title on the first page
    let tableY = pageTopMargin;

    if (index === 0) {
      const legalParagraph = new Konva.Text({
        x: margin,
        y: pageTopMargin + 4,
        text: 'Assinado eletronicamente com assinatura eletrônica avançada, nos termos da Lei nº 14.063/2020 e do art. 10, §2º, da MP nº 2.200-2/2001. Documento final selado digitalmente com certificado A1 emitido no âmbito da ICP-Brasil para preservação de integridade, autenticidade técnica e verificabilidade do arquivo.',
        fontFamily: certificateFontFamily,
        fontSize: textSm,
        width: tableWidth - rowPadding * 2,
        wrap: 'char',
        lineHeight: 1.4,
        fill: textMutedForeground,
      });
      group.add(legalParagraph);
      tableY = legalParagraph.getClientRect().y + legalParagraph.getClientRect().height + 10;
    }

    table.setAttrs({
      x: margin,
      y: tableY,
    } satisfies Partial<Konva.GroupConfig>);

    group.add(table);

    // Add QR code and branding on the last page if there is space.
    if (index === tables.length - 1 && !hidePoweredBy) {
      const remainingHeight = pageHeight - group.getClientRect().height - pageBottomMargin;

      if (brandingRect.height + brandingTopPadding <= remainingHeight) {
        brandingGroup.setAttrs({
          x: pageWidth - brandingRect.width - margin,
          y: group.getClientRect().height + brandingTopPadding,
        } satisfies Partial<Konva.GroupConfig>);

        page.add(brandingGroup);
        isQrPlaced = true;
      }
    }

    // Add the "Document Validation" block on the last page below the table.
    if (index === tables.length - 1) {
      const validationGroup = renderValidationBlock({
        i18n,
        envelopeId,
        qrToken,
        width: tableWidth - rowPadding * 2,
        baseDocumentSha256,
        sealedPdfSha256,
        sealedAt,
        sealedTimezone,
        pdfSignatureValidationStatus,
        icpBrasilChainValidationStatus,
        internalValidationStatus,
        itiReport,
      });

      const validationY = group.getClientRect().height + brandingTopPadding;
      const validationHeight = validationGroup.getClientRect().height;
      const fitsOnPage = validationY + validationHeight + pageBottomMargin <= pageHeight;

      if (fitsOnPage) {
        validationGroup.setAttrs({
          x: margin,
          y: validationY,
        } satisfies Partial<Konva.GroupConfig>);

        page.add(validationGroup);
      } else {
        // Block does not fit on the current page; push it to a fresh page.
        const overflowPage = new Konva.Layer();
        validationGroup.setAttrs({
          x: margin,
          y: pageTopMargin,
        } satisfies Partial<Konva.GroupConfig>);
        overflowPage.add(validationGroup);

        const overflowFooter = new Konva.Text({
          x: margin,
          y: pageHeight - textXs - 10,
          text: `${i18n._(msg`Envelope ID`)}: ${envelopeId}`,
          fontFamily: certificateFontFamily,
          fontSize: textXs,
          fill: textMutedForegroundLight,
        });
        overflowPage.add(overflowFooter);

        stage.add(overflowPage);

        const overflowCanvas = overflowPage.canvas._canvas as unknown as Canvas; // eslint-disable-line @typescript-eslint/consistent-type-assertions
        const overflowBuffer = await overflowCanvas.toBuffer('pdf');
        pages.push(new Uint8Array(overflowBuffer));
      }
    }

    const footerText = new Konva.Text({
      x: margin,
      y: pageHeight - textXs - 10,
      text: `${i18n._(msg`Envelope ID`)}: ${envelopeId}`,
      fontFamily: certificateFontFamily,
      fontSize: textXs,
      fill: textMutedForegroundLight,
    });
    page.add(footerText);

    page.add(group);
    stage.add(page);

    // Export the page and save it.
    const canvas = page.canvas._canvas as unknown as Canvas; // eslint-disable-line @typescript-eslint/consistent-type-assertions
    const buffer = await canvas.toBuffer('pdf');
    pages.push(new Uint8Array(buffer));
  }

  // Need to create an empty page for the QR code if it hasn't been placed yet.
  if (!hidePoweredBy && !isQrPlaced) {
    const page = new Konva.Layer();

    brandingGroup.setAttrs({
      x: pageWidth - brandingRect.width - margin,
      y: pageTopMargin / 2, // Less padding since there's nothing else on this page.
    } satisfies Partial<Konva.GroupConfig>);

    const overflowFooterText = new Konva.Text({
      x: margin,
      y: pageHeight - textXs - 10,
      text: `${i18n._(msg`Envelope ID`)}: ${envelopeId}`,
      fontFamily: certificateFontFamily,
      fontSize: textXs,
      fill: textMutedForegroundLight,
    });
    page.add(overflowFooterText);

    page.add(brandingGroup);
    stage.add(page);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const canvas = page.canvas._canvas as unknown as Canvas;
    const buffer = await canvas.toBuffer('pdf');

    pages.push(new Uint8Array(buffer));
  }

  stage.destroy();
  stage = null;

  return pages;
}
