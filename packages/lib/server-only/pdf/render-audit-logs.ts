import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { DocumentMeta, Envelope, RecipientRole } from '@prisma/client';
import Konva from 'konva';
import { DateTime } from 'luxon';
import 'konva/skia-backend';
import fs from 'node:fs';
import type { Canvas } from 'skia-canvas';
import { Image as SkiaImage } from 'skia-canvas';
import { UAParser } from 'ua-parser-js';
import { DOCUMENT_STATUS } from '../../constants/document';
import { APP_I18N_OPTIONS } from '../../constants/i18n';
import { RECIPIENT_ROLES_DESCRIPTION } from '../../constants/recipient-roles';
import type { TDocumentAuditLog } from '../../types/document-audit-logs';
import { formatDocumentAuditLogAction } from '../../utils/document-audit-logs';
import { EVIDENCE_TIME_ZONE } from './format-evidence-date-time';
import { ensureFontLibrary } from './helpers';
import { resolvePackageAssetPath } from './resolve-package-asset-path';

const formatLocalDateTime = (date: Date): string => {
  return DateTime.fromJSDate(date)
    .setZone(EVIDENCE_TIME_ZONE)
    .setLocale(APP_I18N_OPTIONS.defaultLocale)
    .toFormat("dd/MM/yyyy 'às' HH:mm:ss");
};

const formatUtcDateTime = (date: Date): string => {
  return DateTime.fromJSDate(date).toUTC().toFormat("yyyy-MM-dd HH:mm:ss 'UTC'");
};

export type AuditLogRecipient = {
  id: number;
  name: string;
  email: string;
  role: RecipientRole;
};

type GenerateAuditLogsOptions = {
  envelope: Omit<Envelope, 'completedAt'> & {
    documentMeta: DocumentMeta;
  };
  envelopeItems: string[];
  recipients: AuditLogRecipient[];
  auditLogs: TDocumentAuditLog[];
  hidePoweredBy: boolean;
  pageWidth: number;
  pageHeight: number;
  i18n: I18n;
  envelopeOwner: {
    email: string;
    name: string;
  };
};

const parser = new UAParser();

const textMutedForegroundLight = '#929DAE';
const textForeground = '#000';
const textMutedForeground = '#64748B';
const fontMedium = '500';

const pageTopMargin = 48;
const pageBottomMargin = 24;
const contentMaxWidth = 768;
const titleFontSize = 14;

// Compact overview card sizes
const compactLabelSize = 6.5;
const compactValueSize = 7.2;
const compactUtcSize = 6.2;
const compactOverviewPadding = 6;
const compactOverviewGap = 4;

// Compact event card sizes
const compactCardTitleSize = 7.8;
const compactCardDescSize = 7;
const compactCardDateSize = 6.8;
const compactCardUtcSize = 6.2;
const compactCardDetailSize = 6.2;
const compactCardPadding = 5;
const compactCardGap = 5;

type CompactOverviewLabelValueOptions = {
  label: string;
  value: string | string[];
  width: number;
  x?: number;
};

const renderCompactOverviewLabelValue = (options: CompactOverviewLabelValueOptions) => {
  const { label, value, width, x } = options;

  const group = new Konva.Group({ x: x ?? 0 });

  const labelText = new Konva.Text({
    text: label,
    fontStyle: fontMedium,
    fontFamily: 'Inter',
    fill: textMutedForeground,
    fontSize: compactLabelSize,
  });

  group.add(labelText);

  if (typeof value === 'string') {
    const valueText = new Konva.Text({
      y: labelText.height() + 2,
      width,
      fontFamily: 'Inter',
      text: value,
      fill: textForeground,
      wrap: 'char',
      lineHeight: 1.2,
      fontSize: compactValueSize,
    });

    group.add(valueText);
  } else {
    for (const v of value) {
      const valText = new Konva.Text({
        y: group.getClientRect().height + 2,
        width,
        fontFamily: 'Inter',
        text: `• ${v}`,
        fill: textForeground,
        wrap: 'char',
        fontSize: compactValueSize,
      });

      group.add(valText);
    }
  }

  return group;
};

type CompactOverviewRowOptions = {
  left: Konva.Group;
  right: Konva.Group;
  contentWidth: number;
  columnWidth: number;
  columnSpacing: number;
};

const renderCompactOverviewRow = (options: CompactOverviewRowOptions) => {
  const { left, right, contentWidth, columnWidth, columnSpacing } = options;

  const row = new Konva.Group();

  left.setAttrs({ x: 0, y: 0 });
  right.setAttrs({ x: columnWidth + columnSpacing, y: 0 });

  row.add(left);
  row.add(right);

  // Add a border-bottom for visual separation, except for the last row
  const rowBottom = new Konva.Rect({
    x: 0,
    y: row.getClientRect().height,
    width: contentWidth,
    height: 0.5,
    fill: '#e5e7eb',
  });
  row.add(rowBottom);

  return row;
};

type RenderCompactOverviewCardOptions = {
  envelope: Omit<Envelope, 'completedAt'> & {
    documentMeta: DocumentMeta;
  };
  envelopeItems: string[];
  envelopeOwner: {
    email: string;
    name: string;
  };
  recipients: AuditLogRecipient[];
  contentWidth: number;
  i18n: I18n;
};

const renderCompactOverviewCard = (options: RenderCompactOverviewCardOptions) => {
  const { envelope, envelopeItems, envelopeOwner, recipients, contentWidth, i18n } = options;

  const columnSpacing = 8;
  const columnWidth = (contentWidth - columnSpacing - compactOverviewPadding * 2) / 2;
  const rowSpacing = compactOverviewGap + 2;

  const card = new Konva.Group();

  // Row 1: Envelope ID + Owner
  const row1 = new Konva.Group({ x: compactOverviewPadding, y: compactOverviewPadding });

  const envelopeIdGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Envelope ID`),
    value: envelope.id,
    width: columnWidth,
  });

  const ownerGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Owner`),
    value: `${envelopeOwner.name} (${envelopeOwner.email})`,
    width: columnWidth,
    x: columnWidth + columnSpacing,
  });

  row1.add(envelopeIdGroup);
  row1.add(ownerGroup);
  card.add(row1);

  // Row 2: Status + Time Zone
  const row2 = new Konva.Group({
    x: compactOverviewPadding,
    y: card.getClientRect().height + rowSpacing + compactOverviewPadding,
  });

  const statusGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Status`),
    value: i18n._(envelope.deletedAt ? msg`Deleted` : DOCUMENT_STATUS[envelope.status].description).toUpperCase(),
    width: columnWidth,
  });

  const timezoneGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Time Zone`),
    value: envelope.documentMeta?.timezone || 'N/A',
    width: columnWidth,
    x: columnWidth + columnSpacing,
  });

  row2.add(statusGroup);
  row2.add(timezoneGroup);
  card.add(row2);

  // Row 3: Created At + Last Updated
  const row3 = new Konva.Group({
    x: compactOverviewPadding,
    y: card.getClientRect().height + rowSpacing + compactOverviewPadding,
  });

  const createdAtGroup = new Konva.Group();
  const createdAtLabel = new Konva.Text({
    text: i18n._(msg`Created At`),
    fontStyle: fontMedium,
    fontFamily: 'Inter',
    fill: textMutedForeground,
    fontSize: compactLabelSize,
  });
  createdAtGroup.add(createdAtLabel);

  const createdAtValue = new Konva.Text({
    y: createdAtLabel.height() + 2,
    width: columnWidth,
    fontFamily: 'Inter',
    text: formatLocalDateTime(envelope.createdAt),
    fill: textForeground,
    wrap: 'char',
    lineHeight: 1.2,
    fontSize: compactValueSize,
  });
  createdAtGroup.add(createdAtValue);

  const createdAtUtc = new Konva.Text({
    y: createdAtValue.y() + createdAtValue.height(),
    width: columnWidth,
    fontFamily: 'Inter',
    text: formatUtcDateTime(envelope.createdAt),
    fill: textMutedForeground,
    fontSize: compactUtcSize,
    lineHeight: 1.15,
  });
  createdAtGroup.add(createdAtUtc);
  createdAtGroup.setAttrs({ x: 0, y: 0 });

  const updatedGroup = new Konva.Group();
  const updatedLabel = new Konva.Text({
    text: i18n._(msg`Last Updated`),
    fontStyle: fontMedium,
    fontFamily: 'Inter',
    fill: textMutedForeground,
    fontSize: compactLabelSize,
  });
  updatedGroup.add(updatedLabel);

  const updatedValue = new Konva.Text({
    y: updatedLabel.height() + 2,
    width: columnWidth,
    fontFamily: 'Inter',
    text: formatLocalDateTime(envelope.updatedAt),
    fill: textForeground,
    wrap: 'char',
    lineHeight: 1.2,
    fontSize: compactValueSize,
  });
  updatedGroup.add(updatedValue);

  const updatedUtc = new Konva.Text({
    y: updatedValue.y() + updatedValue.height(),
    width: columnWidth,
    fontFamily: 'Inter',
    text: formatUtcDateTime(envelope.updatedAt),
    fill: textMutedForeground,
    fontSize: compactUtcSize,
    lineHeight: 1.15,
  });
  updatedGroup.add(updatedUtc);
  updatedGroup.setAttrs({ x: columnWidth + columnSpacing, y: 0 });

  row3.add(createdAtGroup);
  row3.add(updatedGroup);
  card.add(row3);

  // Row 4: Documents + Recipients (full width)
  const row4 = new Konva.Group({
    x: compactOverviewPadding,
    y: card.getClientRect().height + rowSpacing + compactOverviewPadding,
  });

  const docsGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Enclosed Documents`),
    value: envelopeItems,
    width: contentWidth - compactOverviewPadding * 2,
  });
  row4.add(docsGroup);

  const recipientsGroup = renderCompactOverviewLabelValue({
    label: i18n._(msg`Recipients`),
    value: recipients.map(
      (recipient) =>
        `[${i18n._(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}] ${recipient.name} (${recipient.email})`,
    ),
    width: contentWidth - compactOverviewPadding * 2,
    x: 0,
  });
  recipientsGroup.setAttrs({
    y: docsGroup.getClientRect().height + compactOverviewGap,
  });
  row4.add(recipientsGroup);

  card.add(row4);

  // Card border
  const cardRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: contentWidth,
    height: card.getClientRect().height + compactOverviewPadding * 2,
    stroke: '#e5e7eb',
    strokeWidth: 1,
    cornerRadius: 5,
  });

  card.add(cardRect);

  return card;
};

type RenderCompactEventCardOptions = {
  auditLog: TDocumentAuditLog;
  columnWidth: number;
  i18n: I18n;
};

const renderCompactEventCard = (options: RenderCompactEventCardOptions) => {
  const { auditLog, columnWidth, i18n } = options;

  const cardWidth = columnWidth;
  const innerWidth = cardWidth - compactCardPadding * 2;

  parser.setUA(auditLog.userAgent || '');
  const userAgentInfo = parser.getResult();
  const formattedAction = formatDocumentAuditLogAction(i18n, auditLog);
  const browser = userAgentInfo.browser.name;
  const version = userAgentInfo.browser.version;
  const os = userAgentInfo.os.name;
  const userAgentFormatted =
    browser && os ? `${version ? `${browser} ${version}` : browser} em ${os}` : auditLog.userAgent || 'N/A';

  const card = new Konva.Group();

  // Event type title
  const title = new Konva.Text({
    x: compactCardPadding,
    y: compactCardPadding,
    width: innerWidth,
    text: auditLog.type.replace(/_/g, ' '),
    fontFamily: 'Inter',
    fontSize: compactCardTitleSize,
    fontStyle: fontMedium,
    fill: textForeground,
    lineHeight: 1.1,
  });
  card.add(title);

  // Description
  const desc = new Konva.Text({
    x: compactCardPadding,
    y: title.y() + title.height() + 2,
    width: innerWidth,
    text: formattedAction.description,
    fontFamily: 'Inter',
    fontSize: compactCardDescSize,
    fill: textMutedForeground,
    lineHeight: 1.15,
    wrap: 'char',
  });
  card.add(desc);

  // Local date/time
  const dateText = new Konva.Text({
    x: compactCardPadding,
    y: desc.y() + desc.height() + 3,
    width: innerWidth,
    text: formatLocalDateTime(auditLog.createdAt),
    fontFamily: 'Inter',
    fontSize: compactCardDateSize,
    fontStyle: fontMedium,
    fill: textForeground,
    lineHeight: 1.15,
  });
  card.add(dateText);

  // UTC
  const utcText = new Konva.Text({
    x: compactCardPadding,
    y: dateText.y() + dateText.height(),
    width: innerWidth,
    text: formatUtcDateTime(auditLog.createdAt),
    fontFamily: 'Inter',
    fontSize: compactCardUtcSize,
    fill: textMutedForeground,
    lineHeight: 1.15,
  });
  card.add(utcText);

  // Details: User, IP, Agent
  const detailsY = utcText.y() + utcText.height() + 3;

  const detailRowHeight = compactCardDetailSize + 1;
  const labelWidth = 34;

  const details = [
    { label: i18n._(msg`User`), value: auditLog.email || 'N/A' },
    { label: i18n._(msg`IP`), value: auditLog.ipAddress || 'N/A' },
    { label: i18n._(msg`Agent`), value: userAgentFormatted },
  ];

  for (let i = 0; i < details.length; i++) {
    const detail = details[i];
    const detailY = detailsY + i * (detailRowHeight + 1);

    const dt = new Konva.Text({
      x: compactCardPadding,
      y: detailY,
      width: labelWidth,
      text: detail.label,
      fontFamily: 'Inter',
      fontSize: compactCardDetailSize,
      fontStyle: fontMedium,
      fill: textMutedForeground,
      lineHeight: 1.15,
    });
    card.add(dt);

    const dd = new Konva.Text({
      x: compactCardPadding + labelWidth + 3,
      y: detailY,
      width: innerWidth - labelWidth - 3,
      text: detail.value,
      fontFamily: 'Inter',
      fontSize: compactCardDetailSize,
      fill: textForeground,
      lineHeight: 1.15,
      wrap: 'char',
    });
    card.add(dd);
  }

  // Card border
  const cardHeight = card.getClientRect().height + compactCardPadding * 2;

  const cardBorder = new Konva.Rect({
    x: 0,
    y: 0,
    width: cardWidth,
    height: cardHeight,
    stroke: '#e5e7eb',
    strokeWidth: 1,
    cornerRadius: 4,
  });

  card.add(cardBorder);

  return card;
};

const renderBranding = () => {
  const branding = new Konva.Group();

  const brandingHeight = 16;

  const logo = fs.readFileSync(resolvePackageAssetPath('logodocs.png'));

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const img = new SkiaImage(logo) as unknown as HTMLImageElement;

  const brandingImage = new Konva.Image({
    image: img,
    height: brandingHeight,
    width: brandingHeight * (img.width / img.height),
  });

  branding.add(brandingImage);
  return branding;
};

type BuildTwoColumnLayoutOptions = {
  auditLogs: TDocumentAuditLog[];
  contentWidth: number;
  i18n: I18n;
  overviewCard: Konva.Group;
};

type TwoColumnLayout = {
  eventGroups: Konva.Group[];
  totalEventHeight: number;
};

const buildTwoColumnLayout = (options: BuildTwoColumnLayoutOptions): TwoColumnLayout => {
  const { auditLogs, contentWidth, i18n } = options;

  const columnGap = compactCardGap;
  const columnWidth = (contentWidth - columnGap) / 2;

  const events: Konva.Group[] = [];

  for (const auditLog of auditLogs) {
    const cardGroup = renderCompactEventCard({
      auditLog,
      columnWidth,
      i18n,
    });

    events.push(cardGroup);
  }

  // Calculate 2-column positions.
  // Distribute events evenly between left and right columns.
  const midPoint = Math.ceil(events.length / 2);

  const leftColumnEvents = events.slice(0, midPoint);
  const rightColumnEvents = events.slice(midPoint);

  let leftHeight = 0;
  let rightHeight = 0;

  for (const event of leftColumnEvents) {
    event.setAttrs({
      x: 0,
      y: leftHeight,
    });
    leftHeight += event.getClientRect().height + compactCardGap;
  }

  for (const event of rightColumnEvents) {
    event.setAttrs({
      x: columnWidth + columnGap,
      y: rightHeight,
    });
    rightHeight += event.getClientRect().height + compactCardGap;
  }

  // Remove the last gap from each column
  leftHeight = Math.max(0, leftHeight - compactCardGap);
  rightHeight = Math.max(0, rightHeight - compactCardGap);

  const totalEventHeight = Math.max(leftHeight, rightHeight);

  return {
    eventGroups: events,
    totalEventHeight,
  };
};

type RenderCompactPageOptions = {
  overviewCard: Konva.Group;
  eventGroups: Konva.Group[];
  margin: number;
  contentWidth: number;
  i18n: I18n;
  hidePoweredBy: boolean;
};

const renderCompactPage = (options: RenderCompactPageOptions) => {
  const { overviewCard, eventGroups, margin, contentWidth, i18n } = options;

  const pageGroup = new Konva.Group();

  // Title
  const pageTitle = new Konva.Text({
    x: margin,
    y: 0,
    height: pageTopMargin,
    verticalAlign: 'middle',
    text: i18n._(msg`Audit Log`),
    fill: textForeground,
    fontFamily: 'Inter',
    fontSize: titleFontSize,
    fontStyle: '700',
  });
  pageGroup.add(pageTitle);

  // Overview card
  const overviewY = pageGroup.getClientRect().height;
  overviewCard.setAttrs({
    x: margin,
    y: overviewY,
  });
  pageGroup.add(overviewCard);

  // Wrap all events in a group with the 2-column layout
  const eventsGroup = new Konva.Group({
    x: margin,
    y: pageGroup.getClientRect().height + 6,
  });

  for (const event of eventGroups) {
    eventsGroup.add(event);
  }

  pageGroup.add(eventsGroup);

  return pageGroup;
};

export async function renderAuditLogs({
  envelope,
  envelopeOwner,
  envelopeItems,
  recipients,
  auditLogs,
  pageWidth,
  pageHeight,
  i18n,
  hidePoweredBy,
}: GenerateAuditLogsOptions) {
  ensureFontLibrary();

  const minimumMargin = 10;

  const contentWidth = Math.min(pageWidth - minimumMargin * 2, contentMaxWidth);
  const margin = (pageWidth - contentWidth) / 2;

  let stage: Konva.Stage | null = new Konva.Stage({ width: pageWidth, height: pageHeight });

  const overviewCard = renderCompactOverviewCard({
    envelope,
    envelopeOwner,
    envelopeItems,
    recipients,
    contentWidth,
    i18n,
  });

  const { eventGroups, totalEventHeight } = buildTwoColumnLayout({
    auditLogs,
    contentWidth,
    i18n,
    overviewCard,
  });

  const pageGroup = renderCompactPage({
    overviewCard,
    eventGroups,
    margin,
    contentWidth,
    i18n,
    hidePoweredBy,
  });

  const brandingGroup = renderBranding();
  const brandingRect = brandingGroup.getClientRect();
  const brandingTopPadding = 12;

  const pages: Uint8Array[] = [];

  let isBrandingPlaced = false;

  // Render the single page
  stage.destroyChildren();
  const page = new Konva.Layer();

  const footerText = new Konva.Text({
    x: margin,
    y: pageHeight - compactCardDetailSize - 10,
    text: `${i18n._(msg`Envelope ID`)}: ${envelope.id}`,
    fontFamily: 'Inter',
    fontSize: compactCardDetailSize,
    fill: textMutedForegroundLight,
  });
  page.add(footerText);

  page.add(pageGroup);

  // Add branding if there is space
  if (!hidePoweredBy) {
    const remainingHeight = pageHeight - pageGroup.getClientRect().height - pageBottomMargin;

    if (brandingRect.height + brandingTopPadding <= remainingHeight) {
      brandingGroup.setAttrs({
        x: pageWidth - brandingRect.width - margin,
        y: pageGroup.getClientRect().height + brandingTopPadding,
      } satisfies Partial<Konva.GroupConfig>);

      page.add(brandingGroup);
      isBrandingPlaced = true;
    }
  }

  stage.add(page);

  // Export the page and save it.
  const canvas = page.canvas._canvas as unknown as Canvas; // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const buffer = await canvas.toBuffer('pdf');
  pages.push(new Uint8Array(buffer));

  // Need to create an empty page for the branding if it hasn't been placed yet.
  if (!hidePoweredBy && !isBrandingPlaced) {
    stage.destroyChildren();
    const overflowPage = new Konva.Layer();

    brandingGroup.setAttrs({
      x: pageWidth - brandingRect.width - margin,
      y: pageTopMargin,
    } satisfies Partial<Konva.GroupConfig>);

    const overflowFooterText = new Konva.Text({
      x: margin,
      y: pageHeight - compactCardDetailSize - 10,
      text: `${i18n._(msg`Envelope ID`)}: ${envelope.id}`,
      fontFamily: 'Inter',
      fontSize: compactCardDetailSize,
      fill: textMutedForegroundLight,
    });
    overflowPage.add(overflowFooterText);

    overflowPage.add(brandingGroup);
    stage.add(overflowPage);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const overflowCanvas = overflowPage.canvas._canvas as unknown as Canvas;
    const overflowBuffer = await overflowCanvas.toBuffer('pdf');

    pages.push(new Uint8Array(overflowBuffer));
  }

  stage.destroy();
  stage = null;

  return pages;
}
