Incluir o link de verificacao do documento assinado na plataforma do Validar ITI do GovBR 
https://validar.iti.gov.br/

Objetivo:
Adicionar, na seção “Certificado de Assinatura” do documento assinado, um bloco de validação compatível com o fluxo do VALIDAR/ITI, permitindo que o usuário valide manualmente o PDF final lacrado por upload, URL ou QR Code.

Contexto técnico:
O VALIDAR/ITI não deve ser tratado como uma API REST pública estável para validação automática em massa. A integração deve seguir o modelo de compatibilidade por URL/QR Code, disponibilizando uma URL pública temporária do PDF assinado/lacrado. O VALIDAR poderá acessar essa URL e, quando aplicável, adicionar parâmetros como `_format=application/validador-iti+json` e `_secretCode`.

A aplicação deve:

1. Lacrar/selar o PDF final com certificado A1 ICP-Brasil.
2. Calcular o hash SHA-256 final do PDF lacrado.
3. Disponibilizar uma URL pública segura e temporária para acesso ao PDF final.
4. Gerar link e QR Code de validação.
5. Exibir esses dados no Certificado de Assinatura/Evidências.
6. Permitir upload posterior do relatório oficial emitido pelo VALIDAR/ITI.

Alterações obrigatórias na seção “Certificado de Assinatura”:

1. Adicionar bloco “Validação do Documento”
   Incluir após os dados principais da assinatura ou após os hashes:

Título:
Validação do Documento

Texto:
Este documento pode ser validado no serviço VALIDAR/ITI por upload do arquivo PDF, URL pública ou QR Code. O PDF final foi selado digitalmente com certificado A1 ICP-Brasil, e sua integridade pode ser conferida pelo hash SHA-256 do PDF final lacrado.

Campos a exibir:

* Link de validação BchatSign:
  {{bchatValidationUrl}}

* Link público temporário do PDF final lacrado:
  {{sealedPdfPublicUrl}}

* Hash SHA-256 do documento base:
  {{baseDocumentSha256}}

* Hash SHA-256 do PDF final lacrado:
  {{sealedPdfSha256}}

* Status da validação interna:
  {{internalValidationStatus}}

* Resultado da assinatura digital:
  {{pdfSignatureValidationStatus}}

* Status da cadeia ICP-Brasil:
  {{icpBrasilChainValidationStatus}}

* Data/hora do lacre:
  {{sealedAtLocal}} — America/Recife
  UTC: {{sealedAtUtc}}

2. Gerar QR Code de validação
   Adicionar QR Code no Certificado de Assinatura apontando preferencialmente para a página pública de validação do BchatSign:

{{bchatValidationUrl}}

A página pública de validação deve exibir:

* dados do envelope;
* dados dos signatários;
* hash do documento base;
* hash do PDF final lacrado;
* status da validação interna;
* botão para baixar o PDF final lacrado;
* instrução para validar o PDF no VALIDAR/ITI;
* botão/link para abrir o VALIDAR/ITI;
* área para anexar o relatório oficial do VALIDAR/ITI, quando disponível.

3. Criar endpoint público compatível com consulta por URL
   Criar endpoint público para disponibilizar o PDF final lacrado de forma segura:

GET /public/validation/:envelopeId/document.pdf?token={{secureToken}}

Requisitos:

* O endpoint deve retornar o PDF final lacrado.
* O token deve ser assinado, temporário e revogável.
* O endpoint deve validar se o envelope está concluído.
* O endpoint deve registrar logs de acesso.
* O endpoint deve retornar Content-Type: application/pdf.
* O endpoint deve suportar acesso por validadores externos.
* O endpoint não deve exigir login do usuário final quando usado com token válido.

4. Criar endpoint para metadados de validação
   Criar endpoint JSON para metadados públicos do envelope:

GET /public/validation/:envelopeId/metadata?token={{secureToken}}

Retorno esperado:
{
"envelopeId": "{{envelopeId}}",
"documentStatus": "COMPLETED",
"baseDocumentSha256": "{{baseDocumentSha256}}",
"sealedPdfSha256": "{{sealedPdfSha256}}",
"sealedPdfUrl": "{{sealedPdfPublicUrl}}",
"sealedAt": "{{sealedAtUtc}}",
"timezone": "America/Recife",
"signatureType": "advanced_electronic_signature_with_icp_brasil_seal",
"pdfSignatureValidationStatus": "{{pdfSignatureValidationStatus}}",
"icpBrasilChainValidationStatus": "{{icpBrasilChainValidationStatus}}",
"certificateSubject": "{{sealingCertificateSubject}}",
"certificateIssuer": "{{sealingCertificateIssuer}}",
"certificateSerialNumber": "{{sealingCertificateSerialNumber}}"
}

5. Preparar compatibilidade com VALIDAR/ITI por QR Code/URL
   A URL pública do PDF deve estar preparada para receber parâmetros adicionados pelo VALIDAR/ITI, por exemplo:

* _format=application/validador-iti+json
* _secretCode={{secretCode}}

Quando a requisição vier com:
_format=application/validador-iti+json

O endpoint deve retornar JSON em vez do PDF, contendo a URL final do documento assinado/lacrado.

Exemplo de resposta:
{
"url": "{{sealedPdfPublicUrl}}"
}

Observação:
Essa compatibilidade serve para o VALIDAR/ITI localizar o PDF a ser validado. Não implementar scraping nem automação não-oficial do relatório do VALIDAR/ITI.

6. Persistência no banco de dados
   Adicionar ou revisar os seguintes campos no modelo de envelope/documento:

* base_document_sha256
* sealed_pdf_sha256
* sealed_pdf_storage_key
* sealed_pdf_public_token_hash
* sealed_pdf_public_url_expires_at
* sealed_at
* sealed_timezone
* sealing_certificate_subject
* sealing_certificate_issuer
* sealing_certificate_serial_number
* sealing_certificate_valid_from
* sealing_certificate_valid_to
* pdf_signature_validation_status
* icp_brasil_chain_validation_status
* internal_validation_status
* iti_report_uploaded_at
* iti_report_storage_key
* iti_report_validation_status
* iti_report_validated_hash
* iti_report_validation_date
* iti_report_signature_count
* iti_report_anchored_signature_count

7. Upload do relatório oficial do VALIDAR/ITI
   Adicionar funcionalidade para anexar ao envelope o relatório PDF emitido pelo VALIDAR/ITI.

Tela/API:
POST /api/envelopes/:envelopeId/iti-report

Campos:

* file: PDF do relatório do VALIDAR/ITI
* validationDate
* validatedHash
* status
* signatureCount
* anchoredSignatureCount
* certificateSubject
* certificateIssuer

Ao salvar:

* armazenar o PDF do relatório;
* vincular ao envelope;
* comparar `validatedHash` com `sealed_pdf_sha256`;
* se forem iguais e o status for aprovado, marcar:
  iti_report_validation_status = "APPROVED"
* se forem diferentes, marcar:
  iti_report_validation_status = "HASH_MISMATCH"

8. Regras de exibição no Certificado de Assinatura
   Se ainda não houver relatório VALIDAR/ITI anexado, exibir:

Validação VALIDAR/ITI:
Pendente de relatório oficial. Este documento pode ser validado manualmente no VALIDAR/ITI por upload do PDF final lacrado, URL pública ou QR Code.

Se houver relatório anexado e aprovado, exibir:

Validação VALIDAR/ITI:
Aprovada em {{itiReportValidationDate}}.
Hash validado: {{itiReportValidatedHash}}
Quantidade de assinaturas: {{itiReportSignatureCount}}
Quantidade de assinaturas ancoradas: {{itiReportAnchoredSignatureCount}}

Se houver divergência de hash, exibir:

Validação VALIDAR/ITI:
Relatório anexado com divergência de hash. O hash validado no relatório não corresponde ao hash SHA-256 do PDF final lacrado armazenado neste envelope.

9. Ajustar texto do Certificado de Assinatura
   Usar o seguinte texto padrão:

Este documento foi assinado eletronicamente com assinatura eletrônica avançada, nos termos da Lei nº 14.063/2020 e do art. 10, §2º, da MP nº 2.200-2/2001.

O documento final foi selado digitalmente com certificado A1 emitido no âmbito da ICP-Brasil para preservação de integridade, autenticidade técnica e verificabilidade do arquivo.

A validação pode ser realizada no BchatSign por meio do link ou QR Code abaixo. Também é possível validar o PDF final lacrado no serviço VALIDAR/ITI, por upload do arquivo, URL pública ou QR Code.

10. Critérios de aceite
    A implementação será considerada correta quando:

* O Certificado de Assinatura exibir o link de validação BchatSign.
* O Certificado de Assinatura exibir o QR Code de validação.
* O Certificado de Assinatura exibir o hash do documento base e o hash do PDF final lacrado.
* O hash do PDF final lacrado for calculado depois da aplicação do selo digital A1 ICP-Brasil.
* O hash final exibido no certificado corresponder ao hash apresentado pelo VALIDAR/ITI no campo “Resumo da SHA256 do arquivo”.
* A lateral/rodapé das páginas do contrato não exibir nenhum hash.
* A URL pública temporária do PDF final permitir validação manual por upload, URL ou QR Code.
* O sistema permitir anexar e armazenar o relatório oficial do VALIDAR/ITI.
* O sistema comparar o hash do relatório VALIDAR/ITI com o hash final do PDF lacrado.
* Os horários exibidos no certificado e logs usarem America/Recife como horário principal e UTC apenas como campo complementar.

Para o seu caso específico, o valor confirmado pelo relatório do VALIDAR/ITI como **hash final do PDF lacrado** deve ser salvo em `sealed_pdf_sha256`:

```text
a5e4475f03b60e0507d70e966c8db64cc6743a53b97bc57d845ec88105f55529
```
