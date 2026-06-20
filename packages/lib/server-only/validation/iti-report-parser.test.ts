import { describe, expect, it, vi } from 'vitest';

vi.mock('@libpdf/core', () => ({
  PDF: {
    load: vi.fn().mockResolvedValue({}),
  },
}));

const getDocumentMock = vi.hoisted(() => vi.fn());
const getTextContentMock = vi.hoisted(() => vi.fn());

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  default: {
    getDocument: getDocumentMock,
  },
  getDocument: getDocumentMock,
}));

import { extractItiReportFields } from './iti-report-parser';

const ITI_HASH = 'a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529';

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const setupPdfjsResponse = (text: string) => {
  getTextContentMock.mockResolvedValue({
    items: text.split(' ').map((str) => ({ str })),
  });

  getDocumentMock.mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({ getTextContent: getTextContentMock }),
    }),
  }));
};

describe('extractItiReportFields', () => {
  it('returns all nulls when pdfjs cannot parse the document', async () => {
    getDocumentMock.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('Cannot parse PDF')),
    }));

    const fields = await extractItiReportFields(sampleBytes);

    expect(fields).toEqual({
      validatedHash: null,
      validationDate: null,
      status: null,
      signatureCount: null,
      anchoredSignatureCount: null,
      certificateSubject: null,
      certificateIssuer: null,
    });
  });

  it('extracts the hash, date, status and counters from a typical ITI report text', async () => {
    setupPdfjsResponse(
      [
        'VALIDAR/ITI',
        'SHA-256',
        ITI_HASH,
        'Status APROVADO',
        'Data: 15/03/2026 14:30:00',
        'Total de assinaturas: 3',
        'Assinaturas ancoradas: 2',
        'Assunto: CN=Signer Name',
        'Emissor: CN=ICP-Brasil Authority',
      ].join(' '),
    );

    const fields = await extractItiReportFields(sampleBytes);

    expect(fields.validatedHash).toBe(ITI_HASH);
    expect(fields.status).toBe('APPROVED');
    expect(fields.validationDate).toEqual(new Date(Date.UTC(2026, 2, 15, 14, 30, 0)));
    expect(fields.signatureCount).toBe(3);
    expect(fields.anchoredSignatureCount).toBe(2);
    expect(fields.certificateSubject).toContain('CN=Signer Name');
    expect(fields.certificateIssuer).toContain('CN=ICP-Brasil Authority');
  });

  it('maps REJEITADO status to REJECTED', async () => {
    setupPdfjsResponse(`SHA-256 ${ITI_HASH} REJEITADO`);

    const fields = await extractItiReportFields(sampleBytes);

    expect(fields.status).toBe('REJECTED');
  });

  it('keeps the hash null when no SHA-256 context is present in the text', async () => {
    setupPdfjsResponse('No hash here, just noise');

    const fields = await extractItiReportFields(sampleBytes);

    expect(fields.validatedHash).toBeNull();
    expect(fields.status).toBeNull();
  });
});
