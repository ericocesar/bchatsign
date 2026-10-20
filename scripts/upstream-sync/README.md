# Sincronização com o upstream Documenso

O fork bchatsign parte do Documenso. Este diretório tem o processo para trazer correções
do upstream sem refazer o rename `documenso → bchatsign` nem o formatting do biome a cada
merge.

## Como funciona

- `normalize.sh <worktree> <raiz-do-fork>` aplica ao código do upstream as mesmas
  transformações que o fork recebeu: rename de texto e caminhos, pacote público
  `skia-canvas` no lugar de `@documenso/skia-canvas`, e o biome do fork.
- `build-mirror.sh <raiz-do-fork> <merge-base> <tag>...` gera a branch
  `vendor/upstream-bchatsign`, com um commit por release. Cada commit tem a árvore
  normalizada e o trailer `Upstream-Commit`. As tags `mirror/base` e `mirror/<tag>`
  apontam para os commits. A execução é repetível.

O merge dos releases acontece contra `mirror/base`, que foi incorporado ao `develop`
com `merge -s ours`. Assim o git vê o rename e a formatação como já aplicados, e os
conflitos ficam restritos a divergências de conteúdo de verdade.

## Gerar o espelho

```bash
scripts/upstream-sync/build-mirror.sh . c50a01d0044274a76dab7ebba5ca0a6738ff5e64 \
  v2.12.0 v2.13.0 v2.14.0 v2.15.0 v2.16.0 v2.17.0 v2.18.0 v2.19.0 v2.20.0 v2.21.0
```

Pré-requisito: `git fetch upstream --tags` e `npm install` no fork (o biome vem de
`node_modules/.bin/biome`, na versão 2.4.8).

## Validação

Dois testes precisam passar antes de usar o espelho:

1. **Arquivos que o fork não tocou desde o merge-base são idênticos ao `develop`.**
   Se não forem, o merge de baseline gera conflitos falsos. Resultado: 0 arquivos.
2. **O biome reproduz a formatação do fork.** Normalizar `7648b0a67^` e comparar com
   `7648b0a67`: todo código bate. Só diferem os `.po`, porque esse commit também trouxe
   msgids novos do próprio fork.

## Exceções

Caminhos que o fork deixou com o nome original. Ficam fora da normalização, para que o
espelho coincida com o `develop` neles:

- `.agents/`, `.opencode/`, `.devcontainer/`, `.well-known/` e `apps/remix/public/.well-known/`
- `packages/assets/documenso-supporter-pledge.pdf`
- `@documenso/nodemailer-resend`: o fork fixou a versão 4.0.0. O upstream está em 5.0.0.

## Regras para resolver conflitos ao trazer um release

- **Nomes e imports** são sempre `@bchatsign/*`. Se `documenso` aparecer no resultado,
  o problema está no script, não no arquivo: corrija o `normalize.sh`.
- **`package.json`**: junte os dois lados. Mantenha as versões de segurança do fork
  quando forem maiores que as do upstream. `skia-canvas` fica sem escopo, na versão `^3.0.8`.
- **`package-lock.json`** não se resolve à mão: `git checkout --ours package-lock.json && npm install`.
- **`schema.prisma`**: junte os dois lados. Os modelos e campos do fork (VALIDAR/ITI,
  evidência de selagem, certificado e geolocalização) não podem sumir.
- **Traduções (`.po`)**: fique com o lado do fork, rode `npm run translate:extract`,
  traduza para pt-BR o que entrou e rode `npm run translate:compile`.
- **Prevalece o fork**: certificado, selagem e overlay do PDF; VALIDAR/ITI; geolocalização;
  locale pt-BR e formato de data; branding, rodapé de e-mail e domínios `bchat.com.br`;
  `BrandHero`, layout de auth e `app-sidebar`; `docker/`, `Dockerfile`, `render.yaml`,
  `.github/infra` e `scripts/`.
- **Prevalece o upstream**: permissões, routers tRPC, rate limits, claims e cotas, jobs
  e a lógica de e-mail (não o branding).

## Antes de abrir o PR de cada release

- `npx tsc --noEmit` nos pacotes alterados.
- `npm run lint` sem erros novos.
- `npm run test -w @bchatsign/lib` e `npm run test -w @bchatsign/signing`.
- E2E com foco em assinatura, admin, organizações e permissões.
- Migrations: `prisma migrate deploy` em staging com cópia do banco de produção, e
  `prisma migrate diff` contra o schema, sem drift.
- Smoke de assinatura ICP-Brasil e validação VALIDAR/ITI nos releases que tocam PDF e
  assinatura (v2.13, v2.15, v2.18, v2.20 e v2.21).
