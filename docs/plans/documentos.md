## 1. Resumo da solução

O projeto hoje é um monorepo com app principal em `apps/remix`, lógica central em `packages/lib`, banco em `packages/prisma`, componentes em `packages/ui` e o pipeline de fechamento/assinatura do PDF no job `internal.seal-document`. O certificado final é montado nesse fluxo e hoje é anexado como páginas extras ao PDF concluído. ([GitHub][1])

O melhor plano é **não reinventar o certificado atual**. Em vez disso:

* adicionar **novas flags/configurações por documento**;
* manter o **certificado completo na última página**;
* criar um **novo overlay resumido por página** dentro do pipeline `decorateAndSignPdf`;
* alimentar esse overlay com dados já existentes ou já compatíveis com a trilha de auditoria, como `ipAddress` e `userAgent`;
* tratar **geolocalização como dado opcional**, com persistência separada e fallback explícito. ([GitHub][2])

Minha recomendação técnica é:

**a.** Persistir a nova configuração em nível de **documento/envelope**, não em `TeamGlobalSettings` ou `OrganisationGlobalSettings`, porque seu requisito é “por documento”.
**b.** Gerar o bloco resumido usando a mesma stack de PDF já usada no sealing (`@libpdf/core`), dentro de `decorateAndSignPdf`, antes da assinatura criptográfica final.
**c.** Reaproveitar o certificado final existente e só estendê-lo com **geolocalização**. ([GitHub][3])

---

## 2. Arquivos e áreas do projeto impactadas

### Banco / schema

Hoje existem flags globais como `includeSigningCertificate` e `includeAuditLog` em `OrganisationGlobalSettings` e `TeamGlobalSettings`, mas não há evidência, no schema lido, desses novos campos por documento. Isso indica que a mudança principal de persistência deve entrar no modelo do documento/envelope ou em uma tabela nova relacionada a ele. ([GitHub][3])

Áreas impactadas:

* `packages/prisma/schema.prisma`
* `packages/prisma/migrations/*`

### Backend / domínio

O pipeline relevante está em:

* `packages/lib/jobs/definitions/internal/seal-document.handler.ts`
* `packages/lib/server-only/pdf/generate-certificate-pdf.ts`
* `packages/lib/server-only/pdf/*`
* possivelmente tipos/validações em `packages/lib/types/*` e routers/actions de documento em `packages/trpc/server/*` ou handlers do app. ([GitHub][2])

### Frontend

A UI autenticada fica em `apps/remix/app/routes/_authenticated+/*`, com componentes compartilhados em `packages/ui`. Eu não consegui resolver pelo indexador web o arquivo exato da tela de configuração do documento, então aqui o mapeamento de rota específica é uma **inferência**, não uma confirmação. A área certa, porém, é essa camada. ([GitHub][1])

Áreas prováveis:

* `apps/remix/app/routes/_authenticated+/*document*`
* `packages/ui/*`
* formulários/tabs de settings do documento

---

## 3. Plano técnico detalhado

### 3.1 Levantamento da arquitetura atual

Bchatsign roda como monorepo com:

* UI e rotas no `apps/remix`;
* lógica central em `packages/lib`;
* banco via Prisma em `packages/prisma`;
* assinatura PDF em `packages/signing`;
* jobs assíncronos em `packages/lib/jobs`. ([GitHub][1])

O fluxo de assinatura mostrado na arquitetura é:

1. upload;
2. configuração;
3. assinatura do recipient;
4. job `seal-document`;
5. geração do PDF assinado. ([GitHub][1])

No handler de sealing:

* o sistema calcula `needsCertificate` via `settings.includeSigningCertificate`;
* gera `certificatePayload`;
* cria `certificateDoc`;
* chama `decorateAndSignPdf`;
* e dentro dele copia as páginas do certificado para o PDF final. ([GitHub][2])

Isso confirma que o ponto ideal para sua feature é **entre a carga do PDF e a assinatura final**, no `decorateAndSignPdf`. ([GitHub][2])

---

### 3.2 Modelo de dados proposto

#### Nova configuração por documento

Como o requisito é por documento, eu criaria uma estrutura como esta:

* `authenticationMethods`: array/json/string[] com valores permitidos:

  * `SMS`
  * `WHATSAPP`
  * `CAIXA_BCHAT`

* `certificateAllPages`: boolean

* `certificatePosition`: enum

  * `LEFT`
  * `RIGHT`
  * `FOOTER`

Opções de modelagem:

**Opção recomendada**
Criar uma tabela/objeto dedicado, por exemplo `DocumentSecuritySettings` ou `EnvelopeSigningSettings`, ligada ao documento/envelope.

Prós:

* isola bem a feature;
* facilita evolução futura;
* evita poluir o model principal.

Contras:

* mais join e migration.

**Opção mínima**
Adicionar colunas direto no model principal do documento/envelope.

Prós:

* implementação mais rápida;
* menos alterações em query.

Contras:

* schema vai ficando mais espalhado.

Eu escolheria a **opção mínima** se o projeto já costuma armazenar settings semelhantes no próprio aggregate do documento; caso contrário, a tabela dedicada é mais limpa.

#### Geolocalização

Não colocaria geolocalização como texto solto dentro do certificado gerado. Persistiria dados estruturados, por exemplo:

* `latitude`
* `longitude`
* `accuracyMeters`
* `capturedAt`
* `source`

Isso pode entrar:

* em evento de auditoria associado à ação de assinatura; ou
* em tabela própria de metadados da assinatura/recipient action.

Como a trilha de auditoria já prevê `ipAddress` e `userAgent`, a geolocalização encaixa melhor como **metadado de auditoria da assinatura**, não como configuração do documento. ([GitHub][4])

---

### 3.3 Backend

#### Persistência

Implementar migration para os novos campos. Para retrocompatibilidade:

* `authenticationMethods`: default vazio
* `certificateAllPages`: `false`
* `certificatePosition`: `FOOTER` ou `RIGHT`

Eu prefiro `FOOTER` como default por reduzir risco de colisão visual com conteúdo do PDF.

#### Validação

Criar enum/schema compartilhado no domínio:

* `ZAuthenticationMethod`
* `ZCertificatePosition`
* schema do payload de update de settings do documento

Validações:

* aceitar 1..n métodos de autenticação;
* impedir valores fora da enum;
* exigir `certificatePosition` sempre que a aba Certificado existir;
* não depender de `certificateAllPages = true` para salvar a posição.

#### Serviço de leitura/gravação

Atualizar a camada que carrega/salva settings do documento. Como a arquitetura usa tRPC/ts-rest e `packages/lib` para lógica central, eu manteria:

* router/action recebe payload;
* valida schema;
* chama função de domínio em `packages/lib/server-only/document/*`;
* persiste via Prisma. ([GitHub][1])

#### Auditoria

O job `seal-document` já recebe `requestMetadata` e o usa para criar log de conclusão do documento. A trilha também já modela `ipAddress` e `userAgent`. Então:

* IP: vem de `requestMetadata`
* Dispositivo: derivado de `userAgent` no momento da renderização do certificado/bloco
* Assinado em: timestamp da assinatura/conclusão
* QR token: o handler já garante `qrToken` no envelope antes da montagem do certificado. ([GitHub][2])

Para geolocalização:

* capturar no front no momento da assinatura, com consentimento;
* enviar ao backend junto da ação de sign;
* persistir como metadado opcional;
* exibir só se existir.

---

### 3.4 Frontend

#### Aba Segurança

Adicionar o campo **Autenticar por** como multi-select com tags.

Comportamento:

* mostrar chips/tags selecionadas;
* permitir selecionar múltiplos;
* persistência imediata via Save ou no submit do formulário existente;
* ajuda contextual explicando que é uma configuração por documento.

#### Nova aba Certificado

Campos:

* `Todas as páginas` (checkbox)
* `Posição do certificado` (select)

UX:

* mesmo com checkbox desligado, manter o select habilitado ou ao menos persistido;
* exibir preview textual curto: “O resumo do certificado será aplicado em todas as páginas no rodapé/lado esquerdo/lado direito”.

#### Compatibilidade com documentos antigos

Ao abrir documento sem os novos campos:

* preencher UI com defaults;
* não exibir erro;
* salvar normalmente na primeira edição.

Como não consegui resolver via indexação o arquivo exato da tela, eu trataria isso como alteração na rota autenticada de edição/configuração do documento mais os componentes de formulário reutilizáveis em `packages/ui`. ([GitHub][1])

---

### 3.5 Geração do PDF

#### Estado atual

Hoje o job:

* carrega PDF;
* normaliza/flatten;
* anexa páginas do certificado e audit log;
* insere fields;
* depois segue para assinatura. ([GitHub][2])

#### Alteração proposta

Adicionar um passo novo dentro de `decorateAndSignPdf`:

1. carregar PDF original;
2. inserir campos já existentes;
3. aplicar **overlay resumido** em cada página, se `certificateAllPages = true`;
4. anexar certificado final completo;
5. anexar audit log, se aplicável;
6. assinar criptograficamente o PDF final.

O ponto crítico é que o overlay deve ser feito **antes da assinatura final**, para que o conteúdo fique incluído no documento assinado.

#### Implementação do overlay

Criar uma função nova, algo como:

* `addCertificateSummaryOverlayToPdf(pdfDoc, options)`

Entrada:

* `signatureId`
* `ipAddress`
* `deviceLabel`
* `signedAt`
* `qrToken/qrUrl`
* `hash`
* `legalText`
* `position`
* margens / dimensões

Saída:

* mutação do `pdfDoc`

#### Posições

* `LEFT`: box vertical estreito no canto inferior esquerdo
* `RIGHT`: box vertical estreito no canto inferior direito
* `FOOTER`: faixa horizontal baixa

#### Evitar sobreposição

Como o PDF pode conter conteúdo em qualquer lugar, não existe garantia perfeita sem análise visual da página. Então o plano seguro é:

* usar área pequena fixa;
* aplicar opacidade leve ou fundo branco sólido;
* reservar margens internas;
* limitar altura/largura;
* truncar/quebrar linhas;
* reduzir QR code no modo lateral.

Melhor ainda: adicionar uma margem mínima fixa de segurança.
Mesmo assim, isso é uma **limitação inerente** do requisito. O modo `FOOTER` deve ser o default porque tende a colidir menos.

#### Hash

O requisito pede hash “como na imagem”. Eu recomendo não calcular esse hash de forma ad hoc no renderer. O ideal é usar o identificador/hash já produzido no fluxo real de assinatura ou validação do documento. Se isso não existir pronto no domínio, essa decisão precisa ser confirmada antes da implementação.

---

### 3.6 Certificado final da última página

O repositório já possui um gerador moderno em `generate-certificate-pdf.ts`, e a versão HTML via Playwright está marcada como deprecada. Então a extensão correta é nesse gerador moderno, não no caminho antigo. ([GitHub][2])

Adicionar ao payload do certificado:

* `deviceGeolocation?: { latitude, longitude, accuracyMeters, capturedAt }`

Renderização:

* se existir: mostrar coordenadas e metadado de captura;
* se não existir: exibir “Não informada” ou omitir a seção.

Eu prefiro **omitir a seção quando ausente** para não sugerir erro de coleta.

---

### 3.7 Dados de auditoria e segurança

#### Origem ideal dos dados

* **ID da assinatura**: transaction id / id de evento de conclusão; hoje o job já cria `transactionId` ao gerar o log de conclusão. ([GitHub][2])
* **Endereço IP**: `requestMetadata.ipAddress`, compatível com o schema de audit log. ([GitHub][2])
* **Dispositivo**: derivado de `userAgent`, também previsto no schema. ([GitHub][4])
* **Assinado em**: timestamp do evento de assinatura/conclusão.
* **QR Code**: baseado no `qrToken`; o handler já garante esse token no envelope. ([GitHub][2])
* **Geolocalização**: navegador do assinante, com consentimento explícito.

#### Cuidados

* geolocalização é dado sensível: coletar só com opt-in;
* fallback obrigatório quando negado;
* considerar política de retenção;
* não bloquear assinatura caso a geolocalização falhe.

---

## 4. Riscos e decisões em aberto

### Riscos técnicos

1. **Sobreposição no conteúdo do PDF**
   O resumo em todas as páginas pode colidir com conteúdo existente. `FOOTER` reduz risco, mas não elimina.

2. **Fonte/layout do PDF**
   A geração de PDF já passou por transições e houve issues ligadas ao pipeline de sealing e certs. Alterar o pipeline exige teste fino. ([GitHub][5])

3. **Ambientes self-hosted**
   O caminho antigo de Playwright para certificado já causou falhas em containers; como o arquivo está deprecado, a implementação nova deve ficar no gerador PDF moderno para evitar reintroduzir esse risco. ([GitHub][6])

4. **Geolocalização indisponível**
   Navegador pode negar, dispositivo pode não expor, políticas corporativas podem bloquear.

### Decisões em aberto

* esses settings são por **documento**, por **template** também, ou ambos?
* `Caixa BChat` é só label de UI ou haverá integração real no fluxo de autenticação?
* qual é a fonte oficial do **hash** mostrado no resumo?
* o “ID da Assinatura” deve ser o `transactionId`, o id do envelope, ou outro identificador externo?
* geolocalização deve aparecer como:

  * coordenadas puras,
  * link/mapa,
  * cidade aproximada por reverse geocoding?
    Eu recomendo **somente coordenadas + precisão**, sem geocoding no MVP.

---

## 5. Checklist de implementação

### Fase 1 — modelagem

* mapear model correto do documento/envelope para receber settings
* adicionar migration
* definir enums:

  * authentication methods
  * certificate position

### Fase 2 — backend

* criar schema/validators
* atualizar serviços de leitura/gravação do documento
* expor novos campos na API/loader/action usada pela tela de settings
* adicionar persistência de geolocalização no evento de assinatura

### Fase 3 — frontend

* adicionar multi-select com tags em Segurança
* adicionar aba Certificado
* carregar defaults para documentos antigos
* salvar e reidratar os valores corretamente

### Fase 4 — PDF

* criar `addCertificateSummaryOverlayToPdf`
* integrar no `decorateAndSignPdf`
* estender `generate-certificate-pdf.ts` com geolocalização
* manter certificado completo na última página

### Fase 5 — rollout

* feature flag interna opcional
* liberar primeiro só `FOOTER`
* depois habilitar `LEFT/RIGHT` se layout estiver estável

---

## 6. Checklist de testes

### Unitários

* validação de enums
* serialização/desserialização de `authenticationMethods`
* defaults para documentos antigos
* builder do resumo por página
* render condicional de geolocalização

### Integração

* salvar settings do documento e recarregar
* sealing com `certificateAllPages = false`
* sealing com `certificateAllPages = true`
* posições `LEFT`, `RIGHT`, `FOOTER`
* certificado final com e sem geolocalização

### E2E

* editar documento > salvar Segurança
* editar documento > salvar aba Certificado
* concluir assinatura
* baixar PDF e validar:

  * resumo em todas as páginas
  * certificado completo na última
  * QR presente
  * campos corretos

### Regressão

* documento antigo sem novos campos continua assinando
* include signing certificate atual continua funcionando
* audit log atual continua funcionando
* documentos rejeitados não quebram sealing

---

## 7. Critérios de aceite

A feature pode ser considerada pronta quando:

1. Em **Configurações do Documento > Segurança**, existe o campo **Autenticar por** com seleção múltipla por tags e opções `SMS`, `WhatsApp` e `Caixa BChat`, com persistência correta.
2. Em **Configurações do Documento**, existe a aba **Certificado** com:

   * `Todas as páginas`
   * `Posição do certificado` (`esquerda`, `direita`, `rodapé`)
3. Quando `Todas as páginas = true`, o PDF final contém em todas as páginas o bloco resumido com:

   * ID da Assinatura
   * Endereço IP
   * Dispositivo
   * Assinado em
   * QR Code
   * texto legal
   * hash
4. O certificado completo continua sendo anexado na última página.
5. O certificado final exibe **geolocalização do dispositivo** quando disponível.
6. Documentos antigos, sem os novos campos, continuam funcionando sem erro.
7. O sealing continua assinando o PDF final corretamente após a inserção do novo overlay. ([GitHub][2])

[1]: https://github.com/bchatsign/bchatsign/blob/main/ARCHITECTURE.md "bchatsign/ARCHITECTURE.md at main · bchatsign/bchatsign · GitHub"
[2]: https://github.com/bchatsign/bchatsign/blob/main/packages/lib/jobs/definitions/internal/seal-document.handler.ts "bchatsign/packages/lib/jobs/definitions/internal/seal-document.handler.ts at main · bchatsign/bchatsign · GitHub"
[3]: https://github.com/bchatsign/bchatsign/blob/main/packages/prisma/schema.prisma "bchatsign/packages/prisma/schema.prisma at main · bchatsign/bchatsign · GitHub"
[4]: https://github.com/bchatsign/bchatsign/blob/main/packages/lib/types/document-audit-logs.ts "bchatsign/packages/lib/types/document-audit-logs.ts at main · bchatsign/bchatsign · GitHub"
[5]: https://github.com/bchatsign/bchatsign/issues/1807?utm_source=chatgpt.com "internal.sealdocument fails with \"Unknown font format\" #1807"
[6]: https://github.com/bchatsign/bchatsign/blob/main/packages/lib/server-only/htmltopdf/get-certificate-pdf.ts "bchatsign/packages/lib/server-only/htmltopdf/get-certificate-pdf.ts at main · bchatsign/bchatsign · GitHub"
