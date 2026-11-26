# Atualização v2.22.0 — o que mudou

> Release do upstream Documenso **v2.22.0** (mais o patch **v2.21.1**) trazido para o `develop` do fork bchatsign.
> Commits: `78afcd8fa` (merge), `2fe40f8e5` (biome), `d20725404` (fixture), `a68aa6bcf` (i18n).
> Base anterior: `v2.21.1`.
>
> Escopo: o espelho v2.22.0 traz **349 arquivos** (+25.576 / −3.701) e **3 migrations** contra a tag anterior. O merge no `develop` soma 960 arquivos porque inclui o v2.21.1, que ainda não estava na branch. Onde uma seção descreve algo que já estava em produção antes do merge, há uma nota marcando isso.

## Resumo

Os quatro eixos do release:

1. **Conteúdo estático no envelope** (texto, linha, forma, destaque, imagem) desenhado sobre o PDF e gravado nele no envio.
2. **E-mails normalizados para minúsculas**, com migrations de backfill.
3. **Fonte manuscrita para campos de iniciais**, com suporte no editor, no canvas e no PDF.
4. **Preferências de usuário e ordenação de pastas**.

Além disso: novos limites de conteúdo por plano, atualização ampla de dependências (nodemailer 10, Playwright 1.64) e correções de robustez no pad de assinatura.

A assinatura persistida em embeds e parte do trabalho de autenticação **já estavam no fork** vindos dos espelhos v2.20.0 e v2.21.1; estão documentados na seção 5 e 6 por aparecerem no diff, com nota em cada um.

---

## 1. Conteúdo estático no envelope (Contents)

O autor de um envelope **V2** pode posicionar elementos estáticos diretamente sobre o documento. Eles são "assados" no PDF no momento do envio.

**Tipos suportados:** `text`, `line`, `shape`, `highlight`, `image`.

Casos de uso típicos: logo da empresa no canto de todas as páginas, tarja sobre um parágrafo, marcação de leitura.

### Modelo de dados

Duas tabelas novas (`packages/prisma/migrations/20260922002213_add_envelope_contents/`):

| Tabela | Papel |
|---|---|
| `EnvelopeContent` | Uma linha por elemento, ligada a `Envelope` e `EnvelopeItem`, com `contentMeta` JSONB. |
| `DataContent` | Blob store sem dono, como `DocumentData`. Guarda a imagem de um conteúdo de imagem. |

`EnvelopeContent.dataContentId` é opcional e usa `ON DELETE SET NULL`.

Arquivos centrais:

- `packages/lib/types/envelope-content-meta.ts` — schema Zod e geometria de cada tipo.
- `packages/lib/universal/content-renderer/` — renderização compartilhada (Konva) entre canvas e PDF.
- `packages/lib/server-only/envelope-content/set-envelope-contents.ts` — persistência.
- `packages/lib/server-only/pdf/insert-page-overlay.ts` — overlay por página no PDF.
- `apps/remix/app/components/general/envelope-editor/canvas/` — camada de edição no canvas.

### Regras de negócio

- **Só em envelopes V2.** Envelopes V1 não recebem conteúdos.
- **Sem API pública** nesta primeira versão.
- **Congelados ao sair de `DRAFT`.** `assertContentCanBeChanged` barra a escrita, e a guarda roda duas vezes: fora da transação (falha rápida) e dentro, com `SELECT ... FOR UPDATE` na linha do envelope. O `sendDocument` pega o mesmo lock ao commitar o PDF renderizado (`assertEnvelopeContentsUnchanged`). Assim um dos dois sempre enxerga o estado do outro: ou a escrita vê `PENDING` e recusa, ou o envio vê conteúdos alterados e aborta.
- **Geometria limitada a 5 casas decimais — e o servidor rejeita, não arredonda.** Quem arredonda é o editor, antes de salvar (`roundTo`). Um POST manual com mais casas leva erro. Cores são normalizadas para `#rrggbb` minúsculo; caracteres de controle, *bidi overrides* e *surrogates* isolados são removidos do texto. Campos não passam por essa regra — só conteúdos.
- **Caixa com largura ou altura zero é rejeitada.**
- **Conteúdos em páginas que deixaram de existir são apagados sem aviso** ao substituir o PDF (diferente de campos, que o diálogo de substituição conta antes).
- **A página do conteúdo não é validada contra o PDF no save.** Só é pega no envio ou na selagem.
- **Imagem órfã é aceita.** Substituir ou remover uma imagem de conteúdo não limpa o `DataContent`, porque ele é compartilhado entre template e documentos derivados.

### Quotas

Duas colunas novas em `OrganisationClaim` e `SubscriptionClaim`:

```
envelopeContentCount       Int
envelopeContentImageCount  Int
```

A migration adiciona como `NULL`, faz backfill com `0` (ilimitado) e depois aperta para `NOT NULL`. A regra de `0 = ilimitado` é a mesma de `envelopeItemCount`.

Reflexo em `packages/ee/server-only/limits/server.ts` e `packages/lib/utils/envelope-content.ts`.

### Embed

O editor V2 embedado ganhou a flag `actions.allowContents` (default `true`), em `packages/lib/types/envelope-editor.ts`:

```js
actions: {
  allowContents: false,   // esconde texto, linha, forma, destaque e imagem
  allowAttachments: true,
}
```

Ela controla só o editor embedado. Os conteúdos em si não têm suporte na API pública nesta versão (ver `.concepts/contents.md` do upstream).

### Migration

`20260922002213_add_envelope_contents` — cria `EnvelopeContent`, `DataContent`, dois índices e três FKs, além das colunas de quota.

---

## 2. E-mails sempre em minúsculas

Endereços passam a ser gravados e comparados em minúsculas em todo o fluxo.

### Migrations

| Migration | O que faz |
|---|---|
| `20261111000000_lowercase_user_emails` | Minusculiza uma linha `User` por grupo de e-mails que diferem só por caixa. Se o grupo já tem uma linha minúscula, não mexe; senão, minusculiza a mais antiga. Duplicatas restantes precisam ser mescladas à mão. |
| `20261111000001_lowercase_recipient_emails` | Minusculiza `Recipient`.`email` direto — esses são comparados por igualdade contra `User`.`email`, que já está minúsculo. |

A migration de `User` é escrita para **nunca violar a unique constraint** em `email`.

### Código

- `packages/auth/server/routes/email-password.ts` — as chaves de rate limit (`login`, `resend`, `forgot`) passam a usar `email.toLowerCase()`. Antes, `Foo@x.com` e `foo@x.com` contavam como baldes distintos.
- `packages/api/v1/implementation.ts` — comparação de reciprocidade e busca do novo recipient usam e-mail minúsculo.
- `packages/lib/server-only/user/find-user-by-provided-email.ts` e `forgot-password.ts` — lookup e rate limit normalizados.
- Criação e duplicação de envelope (`create-envelope.ts`, `duplicate-envelope.ts`), atualização de recipients (`update-envelope-recipients.ts`), convites (`create-organisation-member-invites.ts`), templates (`create-document-from-template.ts`, `create-document-from-direct-template.ts`), admin (`update-user.ts`, `update-recipient.ts`) e share links (`complete-document-with-token.ts`, `get-recipient-or-sender-by-share-link-slug.ts`).

> Se houver dados em produção com e-mail em caixa mista, **rode as migrations antes de subir o app**. O código novo assume tudo minúsculo; sem o backfill, um destinatário existente pode deixar de ser reconhecido.

---

## 3. Fonte manuscrita para iniciais

Campos de iniciais (`INITIALS`) ganharam a opção `fontFamily`.

### No campo

```json
{
  "type": "INITIALS",
  "fieldMeta": {
    "type": "initials",
    "fontFamily": "handwriting",
    "textAlign": "center"
  }
}
```

| Valor | Efeito |
|---|---|
| `sans-serif` (default) | Fonte padrão. |
| `handwriting` | Fonte cursiva, com **tamanho padrão de 18px**. |

Em `packages/lib/types/field-meta.ts`:

```ts
export const DEFAULT_HANDWRITING_INITIALS_FONT_SIZE = 18;

export const resolveFieldFontSize = (fieldMeta) => {
  if (fieldMeta?.fontSize !== undefined) return fieldMeta.fontSize;
  if (fieldMeta?.type === 'initials' && fieldMeta.fontFamily === 'handwriting') {
    return DEFAULT_HANDWRITING_INITIALS_FONT_SIZE;
  }
  return DEFAULT_FIELD_FONT_SIZE;
};
```

Regra importante: **um `fontSize` explícito sempre vence**. Ao trocar para `handwriting` no editor, se o tamanho ainda está no default, ele sobe para 18; ao voltar para `sans-serif`, se está em 18, volta ao default.

### Onde é aplicado

- **Editor** — `editor-field-initials-form.tsx`, com o seletor de fonte.
- **Canvas (Konva)** — `render-generic-text-field.ts` usa `getSignatureFontFamily()`, que escolhe Caveat para texto ASCII e Noto para o resto.
- **PDF** — `insert-field-in-pdf-v2.ts`, pelo mesmo caminho de render.
- **Placeholders de PDF** — `{{initials, r1, fontFamily=handwriting}}`.

### Limitação

**Só envelopes.** Documentos legados ignoram a configuração e renderizam iniciais em sans-serif, mesmo com o valor gravado.

---

## 4. Preferências de usuário e ordenação de pastas

### Preferências

Novo cookie `user-preferences` (1 ano, `httpOnly`, `sameSite: lax`):

- `apps/remix/app/utils/user-preferences.ts` — schema Zod.
- `apps/remix/app/storage/user-preferences-cookie.server.ts` — cookie.
- `apps/remix/app/providers/user-preferences.tsx` — provider.
- `apps/remix/app/routes/api+/user-preferences.tsx` — endpoint de escrita.

Todos os campos são opcionais, porque a atualização envia só o que mudou. **Um campo inválido descarta todas as preferências**, não só ele — `parseUserPreferences` faz `safeParse` do objeto inteiro.

### Ordenação de pastas

`apps/remix/app/components/general/folder/folder-sort-dropdown.tsx`, consumido por `folder-grid.tsx`.

Valores: `created-desc`, `created-asc`, `name-asc`, `name-desc`.

A lista de pastas ganhou cabeçalho próprio, com contador e o dropdown. Pastas fixadas continuam aparecendo separadas das demais.

---

## 5. Assinatura persistida em embeds

> **Já estava no fork** via `mirror/v2.21.1`. Incluído porque aparece no diff do merge; não é novidade desta release.

Em embed, a assinatura desenhada ou digitada agora é persistida por `(organização, recipient)`, para reaparecer em sessões seguintes.

- Tabela nova `EmbedSignature` (`20261019120000_add_embed_signature`): `key`, `organisationId`, `recipientId`, `signature`, timestamps.
- `packages/trpc/server/embedding-router/persist-embed-signature.ts`.
- Hook de cliente `use-persist-embed-signature.ts`.

Validação em `persist-embed-signature.types.ts`:

- Imagem: PNG data URL, até **1 MiB**.
- Texto digitado: até **256 caracteres**, sem caracteres da categoria Unicode `Other` (controle, formato, não-atribuídos, surrogates).

---

## 6. Correções e robustez

### Pad de assinatura (`signature-pad-draw.tsx`)

- Clique direito e do meio não iniciam mais traço — o menu de contexto engolia o `pointerup` e deixava o traço preso.
- Um `pointerdown` que começou fora do pad (o que abriu o diálogo, por exemplo) não retoma mais o traço ao entrar na área.
- `pointerup` na janela encerra o estado de pressão.
- Limpar o pad zera `isSignatureValid` e emite `''`.
- Ao terminar o traço, a assinatura só vai para `onChange` se passar em `checkSignatureValidity`; caso contrário, `''`. A validação mede **cobertura de pixels** (precisa passar de 1%, `SIGNATURE_MIN_COVERAGE_THRESHOLD`), e o campo exibe **"Signature is too small"** quando o traço é insuficiente, em vez de aceitar qualquer rabisco.

### PDF

- `insert-page-overlay.ts` é novo e absorve o agrupamento por página que estava inline em `generate-partial-signed-pdf.ts`. Ele também trata rotação de página (90/180/270), girando o overlay para a mesma orientação que o react-pdf usa no frontend.
- `insert-field-in-pdf-v2.ts` desenha conteúdos **antes** dos campos, para ficarem por baixo.
- `generate-partial-signed-pdf.ts` encolheu para um wrapper: carrega as imagens de conteúdo (`loadContentImages`) e delega ao overlay.
- `add-rejection-stamp-to-pdf.ts` ganhou `pageCount` opcional e faz `slice(0, pageCount)` nas páginas, para o stamp não cair sobre o certificado anexado.
- **Quebra de assinatura interna:** `normalizePdf` passou a retornar `{ pdf, pageCount }` em vez de só o `Buffer`, e `putNormalizedPdfFileServerSide` (em `packages/lib/universal/upload/put-file.server.ts`) virou `{ documentData, pageCount }`. Quem chamava o retorno direto precisa desestruturar — foi o ajuste feito em `packages/api/v1/implementation.ts`.

### Webhooks

`trigger-test-webhook.ts` deixou de disparar o webhook em linha e passou a enfileirar um job `internal.execute-webhook`. Erros viraram `AppError` (`INVALID_REQUEST`) em vez de `Error` genérico — o teste agora exige o webhook habilitado, como a UI já indicava.

### Autenticação

> **Já estava no fork** via `mirror/v2.20.0`, com ajustes nesta release. A tabela `AuthHandoff` não é nova deste merge.

Nova tabela `AuthHandoff` (`20260922002212_add_auth_handoff`) e coluna `Session.isEmbed`. Serve para atravessar o salto de contexto do embed (sessão, CSC, erros de CSC) **sem colocar token na URL**.

- O cliente gera um `nonce` UUID; o servidor guarda **apenas o SHA-256** dele, então a tabela não contém segredo em texto claro.
- O payload é cifrado (`payload-crypto.ts`), e o registro expira por TTL (`AUTH_HANDOFF_TTL_MS`).
- Tipos aceitos (`packages/lib/constants/auth-handoff.ts`): `EMBED_SESSION`, `EMBED_CSC_SERVICE`, `EMBED_CSC_SAD`, `EMBED_CSC_BLOCKING_ERROR`, `EMBED_FAILED`. A coluna `type` é string, não enum, para novos tipos não exigirem migration.
- `handle-oauth-callback-url.ts` e `handle-oauth-organisation-callback-url.ts` ajustados ao fluxo.
- Job de limpeza `cleanup-auth-handoffs`.

### Embed

Nova flag `allowDownloadPDF` (default `true`). Ela **só esconde o botão** — não impede o download do documento.

### Templates diretos

`createDocumentFromDirectTemplate` passou a processar **todos** os campos quando o envelope é V2, incluindo read-only e preenchidos. Em V1 mantém o filtro antigo (só obrigatórios ou assinados).

---

## 7. Dependências

### O que veio no release v2.22.0

Já está no `develop`, via merge `78afcd8fa`.

| Pacote | De | Para |
|---|---|---|
| `nodemailer` | ^9.0.0 | ^10.0.0 |
| `@types/nodemailer` | ^8.0.1 | **removido** — o nodemailer 10 traz tipos próprios |
| `playwright` / `@playwright/test` / `@playwright/browser-chromium` | 1.56.1 | 1.64.1 |
| `sharp` | 0.35.4 | 0.35.5 |
| `@react-email/render` | 2.1.0 | 2.2.0 |
| `react-email` | ^6.9.0 | ^6.11.11 |
| `satori` | ^0.18.3 | ^0.63.2 |
| `@hono/node-server` | ^1.19.11 | ^1.19.19 |

Mantidos atrás do upstream, por decisão:

| Pacote | Fork | Upstream |
|---|---|---|
| `@documenso/nodemailer-resend` | 5.0.0 | 6.0.1 |
| `@libpdf/core` | ^0.5.2 | ^0.5.3 |

O upstream também acrescentou overrides para `fflate@0.7`, `@tailwindcss/typography`, `inngest-cli` e `@prisma/config`.

### Correções de segurança pendentes (não commitadas)

Estas estão na working tree, ainda **sem commit**, e são o que destrava o `npm run push`:

```json
"undici@7.x": "7.30.2",
"effect@3.21.x": "3.22.1",
"body-parser": "1.20.9",
"follow-redirects": "1.16.3",
"h3": "1.15.11",
"joi": "18.3.2"
```

Mais o ajuste de `next` 16.3.8 → **16.4.6** nos três apps que usam Next (`docs`, `openpage-api`, e o `package-lock` correspondente), e `@tailwindcss/postcss` → **^4.2.3** em `apps/docs`.

Motivo de cada grupo:

- **`next` 16.4.6** — 2 CRITICAL de RCE (Image Optimization com SVG, e `use cache` retornando typed arrays) mais 1 HIGH de DoS em Server Actions.
- **`h3` 1.15.11** — `trpc-to-openapi` precisa ficar em **2.1.5** (é a versão que o fork declara). Toda versão a partir de 2.2.0 fixa `h3` em `1.15.1`, e override **não** sobrepõe pin exato de um pai — por isso o bloqueio.
- **`joi` / `qs` / `body-parser` / `follow-redirects` / `undici` / `effect`** — CVEs HIGH/CRITICAL reprovadas pelo gate trivy do `npm run push`.
- **`@tailwindcss/postcss` 4.2+** — o CSS do `fumadocs-ui` 16.14.3 usa utilitários `inset-s`, que só existem no Tailwind 4.2. Com a 4.1.18 o build de `apps/docs` falha com `Cannot apply unknown utility class '-inset-s-4'`.

> Essa falha do docs **já existia no HEAD**, antes desta atualização — foi reproduzida numa árvore limpa.

### Script de push

`.opencode` foi adicionado à lista `--skip-dirs` do trivy em `scripts/build-and-push-ghcr.sh`. É uma pasta de scaffolding de ferramenta com lockfile próprio (`toml@4.3.0`, 4 CVEs) que não entra na imagem.

---

## 8. Banco de dados

**Três migrations novas nesta release**, já no `develop`:

```
20260922002213_add_envelope_contents
20261111000000_lowercase_user_emails
20261111000001_lowercase_recipient_emails
```

Duas outras que o diff do fork mostra, mas **não** são desta release — já estavam no `develop` vindas de espelhos anteriores:

| Migration | Origem |
|---|---|
| `20260922002212_add_auth_handoff` | `mirror/v2.20.0` (`5edde84c1`) |
| `20261019120000_add_embed_signature` | `mirror/v2.21.1` (`0df0f56a2`) |

Ou seja: as seções 5 (assinatura em embed) e parte da 6 (autenticação) descrevem código que **já estava no fork** antes deste merge — em `develop`, não necessariamente em produção. Aparecem aqui porque o diff `v2.21.1 → v2.22.0` as contém.

Ordem de aplicação importa: as de lowercase devem rodar antes de o app novo atender tráfego.

Comando:

```bash
npm run prisma:migrate-deploy
```

Verificações antes:

- `User` com e-mails que diferem só por caixa — a migration resolve um por grupo; o resto precisa de merge manual.
- `Recipient` apontando para `User` por e-mail em caixa mista.

---

## 9. Compatibilidade com o fork

Preservado neste merge:

- **Selagem ICP-Brasil / VALIDAR-ITI**, evidência de selagem, certificado por página, QR e geolocalização.
- **Ordem de providers em `root.tsx`** — `TooltipProvider` por fora (fork) e `UserPreferencesProvider` (upstream) convivendo.
- **`links()` do fork** — fontes, favicon e resolução de idioma por cookie explícito.
- **`mailchannels.ts`** — tipos derivados do nodemailer 10 e `transportError` do fork, com o parsing de grupos e o envelope achatado do upstream.
- **`share.$slug.opengraph.tsx`** — arte do fork mantida.
- **`folder-grid.tsx`** — ordenação do upstream adotada; remoções do fork (upload legado, empty-state) mantidas.
- **Convenção de imports** — enums de valor vêm de `@bchatsign/prisma/generated/types`, tipos de `@prisma/client`.

Traduções: `a68aa6bcf` extraiu e traduziu para pt-BR **113 blocos novos** (110 msgids, 3 com `msgctxt` duplicado) e reformulou 12 msgids existentes. As ~626 entradas sem tradução são dívida anterior.

---

## 10. Verificação

Estado da working tree com as correções de dependência aplicadas:

| Etapa | Resultado |
|---|---|
| `npm run lint` (biome 2.4.8) | OK — 908 warnings, 0 erros |
| typecheck `apps/remix` | OK — 0 erros |
| `trivy fs` HIGH/CRITICAL | OK — 0 findings |
| `npm run build` (turbo) | OK — 5/5 tasks |
| `docker buildx build --platform linux/amd64` | OK |
| `npm ci` a partir do lock final | OK — versões conferem |

Duas armadilhas que custaram tempo:

- **`prisma generate` antes do typecheck.** Um client Prisma desatualizado em `node_modules` gera ~2.400 erros de "module has no exported member" que não têm relação com o código. Depois do `npm ci`, rode `npx prisma generate` em `packages/prisma`.
- **Não use `npm update` para aplicar as correções.** Ele promoveu `typescript` para 5.9.3 e `tailwindcss` 3.x, quebrando o typecheck com 62 erros e inflando o lock em 40 mil linhas. O caminho correto foi `npm install --package-lock-only` para o que o npm resolve sozinho, e patch cirúrgico das entradas `joi` / `qs` / `body-parser` que ele se recusava a reescrever.

### Lint: o que mudou e por quê

`apps/remix/app/components/general/organisation-usage-panel.tsx` reprovava em `lint/nursery/noMisusedPromises`: `subtext ?` e `action ?` sobre valores `ReactNode`. O biome 2.4 não consegue provar que `ReactNode` não é uma Promise, então trata o ternário como suspeito. Trocado por `!= null`, que é equivalente para os casos que o componente produz (`undefined`/`null`) e satisfaz a regra.

---

## 11. Estado do repositório

Nada desta seção está commitado ainda. Separar antes de commitar:

**Pendente — correções deste trabalho**

- `package.json`, `package-lock.json`, `apps/docs/package.json`, `apps/openpage-api/package.json` — overrides e bumps de segurança.
- `apps/remix/app/components/general/organisation-usage-panel.tsx` — fix do lint.
- `scripts/build-and-push-ghcr.sh` — `.opencode` no `--skip-dirs`.
- `docs/guides/updates2411.md` — este documento.

**Pendente — artefatos do `npm run push` (`691b85dfb`)**

`docs/historico/build-info.json`, `latest-digest`, `latest-tag`, `latest-image` mudaram porque o push rodou. Não fazem parte do release.

---

## Referências

- Merge: `78afcd8fa` — traz v2.21.1 e v2.22.0.
- Espelho: `fa84b915d` (`mirror/v2.22.0`), gerado por `scripts/upstream-sync/normalize.sh`.
- Upstream commit: `d32d049165db230820465b4f566061ba8fa27012` (`v2.22.0`).
- Plano de execução: `docs/superpowers/plans/2026-11-24-upstream-v2.22.0.md`.
- Decisões de design de Contents: `.concepts/contents.md`.
