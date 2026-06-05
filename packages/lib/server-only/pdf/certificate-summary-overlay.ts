type CertificateOverlayPosition = 'FOOTER' | 'LEFT' | 'RIGHT';

type GetCertificateOverlayLinesOptions = {
  pdfHash: string;
};

type GetCertificateOverlayDrawCommandsOptions = {
  position: CertificateOverlayPosition;
  pageWidth: number;
  pageHeight: number;
  lines: string[];
  fontSize: number;
  getTextWidth: (text: string) => number;
};

export type CertificateOverlayDrawCommand = {
  text: string;
  x: number;
  y: number;
  rotate?: {
    angle: number;
  };
};

const CERTIFICATE_OVERLAY_MARGIN = 15;
const CERTIFICATE_OVERLAY_LINE_GAP = 2;

export const getCertificateOverlayLines = ({ pdfHash }: GetCertificateOverlayLinesOptions): string[] => [
  'Assinado eletronicamente com assinatura eletrônica avançada — Lei nº 14.063/2020 e MP nº 2.200-2/2001',
  `Hash SHA-256: ${pdfHash}`,
];

export const getCertificateOverlayDrawCommands = ({
  position,
  pageWidth,
  pageHeight,
  lines,
  fontSize,
  getTextWidth,
}: GetCertificateOverlayDrawCommandsOptions): CertificateOverlayDrawCommand[] => {
  const lineWidths = lines.map((line) => getTextWidth(line));
  const maxLineWidth = Math.max(...lineWidths);
  const lineHeight = fontSize + CERTIFICATE_OVERLAY_LINE_GAP;
  const verticalBlockThickness = fontSize + (lines.length - 1) * lineHeight;

  if (position === 'FOOTER') {
    return lines.map((line, index) => ({
      text: line,
      x: (pageWidth - lineWidths[index]) / 2,
      y: CERTIFICATE_OVERLAY_MARGIN + (lines.length - 1 - index) * lineHeight,
    }));
  }

  if (position === 'LEFT') {
    return lines.map((line, index) => ({
      text: line,
      x: CERTIFICATE_OVERLAY_MARGIN + index * lineHeight,
      y: CERTIFICATE_OVERLAY_MARGIN,
      rotate: {
        angle: 90,
      },
    }));
  }

  return lines.map((line, index) => ({
    text: line,
    x: pageWidth - CERTIFICATE_OVERLAY_MARGIN - verticalBlockThickness + index * lineHeight,
    y: Math.min(pageHeight - CERTIFICATE_OVERLAY_MARGIN, CERTIFICATE_OVERLAY_MARGIN + maxLineWidth),
    rotate: {
      angle: 270,
    },
  }));
};
