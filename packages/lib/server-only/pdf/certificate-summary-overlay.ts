type CertificateOverlayPosition = 'FOOTER' | 'LEFT' | 'RIGHT';

type GetCertificateOverlayDrawCommandsOptions = {
  position: CertificateOverlayPosition;
  pageWidth: number;
  pageHeight: number;
  lines: string[];
  fontSize: number;
  getTextWidth: (text: string) => number;
  validationLink?: string | null;
};

export type CertificateOverlayDrawCommand = {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  rotate?: {
    angle: number;
  };
};

export type CertificateOverlayQrCommand = {
  kind: 'qr';
  x: number;
  y: number;
  size: number;
};

export type CertificateOverlayVerticalLabelCommand = {
  kind: 'vertical-label';
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

export type CertificateOverlayCommand = CertificateOverlayDrawCommand | CertificateOverlayQrCommand | CertificateOverlayVerticalLabelCommand;

const CERTIFICATE_OVERLAY_MARGIN = 15;
const CERTIFICATE_OVERLAY_LINE_GAP = 2;

export const getCertificateOverlayLines = (): string[] => [
  'Assinado eletronicamente com assinatura eletrônica avançada — Lei nº 14.063/2020 e MP nº 2.200-2/2001.',
  'Integridade verificável por Hash SHA-256, ID da assinatura, IP, dispositivo, data/hora e logs de auditoria.',
  'Documento final selado digitalmente com certificado A1 ICP-Brasil.',
];

export const getCertificateOverlayDrawCommands = ({
  position,
  pageWidth,
  pageHeight,
  lines,
  fontSize,
  getTextWidth,
  validationLink,
}: GetCertificateOverlayDrawCommandsOptions): CertificateOverlayCommand[] => {
  const lineWidths = lines.map((line) => getTextWidth(line));
  const maxLineWidth = Math.max(...lineWidths);
  const lineHeight = fontSize + CERTIFICATE_OVERLAY_LINE_GAP;
  const verticalBlockThickness = fontSize + (lines.length - 1) * lineHeight;

  if (position === 'FOOTER') {
    const commands: CertificateOverlayCommand[] = [];
    const qrSize = 32;

    // Text lines on the left
    for (const [index, line] of lines.entries()) {
      commands.push({
        kind: 'text',
        text: line,
        x: CERTIFICATE_OVERLAY_MARGIN,
        y: CERTIFICATE_OVERLAY_MARGIN + index * lineHeight,
      });
    }

    // QR code to the right of the text block
    if (validationLink) {
      const textBlockWidth = maxLineWidth;
      const qrX = CERTIFICATE_OVERLAY_MARGIN + textBlockWidth + 16;
      const qrY = CERTIFICATE_OVERLAY_MARGIN;

      commands.push({
        kind: 'qr',
        x: qrX,
        y: qrY,
        size: qrSize,
      });

      // Validator name vertically to the right of the QR code
      commands.push({
        kind: 'vertical-label',
        text: 'BCHATSIGN',
        x: qrX + qrSize + 4,
        y: qrY + qrSize,
        fontSize: 6,
      });
    }

    return commands;
  }

  if (position === 'LEFT') {
    return lines.map((line, index) => ({
      kind: 'text' as const,
      text: line,
      x: CERTIFICATE_OVERLAY_MARGIN + index * lineHeight,
      y: CERTIFICATE_OVERLAY_MARGIN,
      rotate: {
        angle: 90,
      },
    }));
  }

  return lines.map((line, index) => ({
    kind: 'text' as const,
    text: line,
    x: pageWidth - CERTIFICATE_OVERLAY_MARGIN - verticalBlockThickness + index * lineHeight,
    y: Math.min(pageHeight - CERTIFICATE_OVERLAY_MARGIN, CERTIFICATE_OVERLAY_MARGIN + maxLineWidth),
    rotate: {
      angle: 270,
    },
  }));
};
