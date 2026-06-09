import { PDF } from '@libpdf/core';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export type ParsedItiReportFields = {
  validatedHash: string | null;
  validationDate: Date | null;
  status: string | null;
  signatureCount: number | null;
  anchoredSignatureCount: number | null;
  certificateSubject: string | null;
  certificateIssuer: string | null;
};

const SHA256_HEX = /\b[0-9a-fA-F]{64}\b/g;
const DATE_PT = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/;
const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/;

const findHash = (text: string): string | null => {
  const contextual = /(?:SHA-?256|Resumo\s+da\s+SHA256|hash\s+SHA-?256)[^0-9a-fA-F]{0,200}([0-9a-fA-F]{64})/i.exec(
    text,
  );

  if (contextual?.[1]) {
    return contextual[1].toLowerCase();
  }

  const generic = SHA256_HEX.exec(text);

  return generic ? generic[0].toLowerCase() : null;
};

const findStatus = (text: string): string | null => {
  const normalized = text.toUpperCase();

  if (/(APROVAD[OA]|VALID|APPROVED|SUCCESS|OK)/.test(normalized)) {
    return 'APPROVED';
  }

  if (/(REPROVAD[OA]|REJEITAD[OA]|REJECTED|FAILED|INVALID)/.test(normalized)) {
    return 'REJECTED';
  }

  if (/(PARCIAL|PARTIAL|WARNING|INDETERMINATE)/.test(normalized)) {
    return 'WARNING';
  }

  return null;
};

const findDate = (text: string): Date | null => {
  const pt = DATE_PT.exec(text);
  if (pt) {
    const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = pt;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)));
  }

  const iso = ISO_DATE.exec(text);
  if (iso) {
    const [, yyyy, mm, dd, hh = '00', mi = '00', ss = '00'] = iso;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)));
  }

  return null;
};

const findCount = (text: string, label: RegExp): number | null => {
  const match = label.exec(text);
  if (!match) {
    return null;
  }

  const numberMatch = /(\d{1,7})/.exec(match[0]);
  return numberMatch ? Number.parseInt(numberMatch[1], 10) : null;
};

const findCertificateField = (text: string, label: RegExp): string | null => {
  const match = label.exec(text);
  if (!match) {
    return null;
  }

  const line = match[0];
  const colonIndex = line.indexOf(':');

  if (colonIndex === -1) {
    return line.replace(label, '').trim() || null;
  }

  return line.slice(colonIndex + 1).trim() || null;
};

/**
 * Extracts a text representation of the report PDF using pdfjs. Returns an
 * empty string on any parsing failure so the caller can still rely on
 * manually-entered fields.
 */
const extractText = async (bytes: Uint8Array): Promise<string> => {
  try {
    const task = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= task.numPages; i++) {
      const page = await task.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean);
      pages.push(strings.join(' '));
    }

    return pages.join('\n');
  } catch (error) {
    console.warn('Failed to extract text from ITI report PDF:', error);
    return '';
  }
};

/**
 * Validates that the given bytes are a parseable PDF (not encrypted).
 * Throws AppError when the file is not a valid PDF.
 */
export const assertValidPdf = async (bytes: Uint8Array) => {
  await PDF.load(bytes).catch(() => {
    throw new Error('INVALID_PDF');
  });
};

/**
 * Parses an ITI/VALIDAR report PDF and pre-fills the fields recognised from
 * the rendered text. Fields that cannot be located remain null and must be
 * supplied by the user before submission.
 */
export const extractItiReportFields = async (bytes: Uint8Array): Promise<ParsedItiReportFields> => {
  await assertValidPdf(bytes);

  const text = await extractText(bytes);

  return {
    validatedHash: findHash(text),
    validationDate: findDate(text),
    status: findStatus(text),
    signatureCount: findCount(text, /(?:total\s+de\s+)?assinaturas?\s*:?\s*\d{1,7}/i),
    anchoredSignatureCount: findCount(text, /assinaturas?\s+ancoradas?\s*:?\s*\d{1,7}/i),
    certificateSubject: findCertificateField(text, /(?:assunto|subject)\s*:?\s*[^\n]{0,200}/i),
    certificateIssuer: findCertificateField(text, /(?:emissor|emitido\s+por|issuer)\s*:?\s*[^\n]{0,200}/i),
  };
};
