#!/usr/bin/env bash
# Normaliza uma árvore do upstream Documenso para o naming e a formatação do fork bchatsign.
#
# Uso: normalize.sh <worktree-do-upstream> <raiz-do-fork>
#
# <raiz-do-fork> fornece o biome.json e o binário do biome, para que a formatação
# seja idêntica à do fork. Só altera arquivos rastreados pelo git.
set -euo pipefail

UPSTREAM_DIR="${1:?uso: normalize.sh <worktree-do-upstream> <raiz-do-fork>}"
FORK_DIR="${2:?uso: normalize.sh <worktree-do-upstream> <raiz-do-fork>}"
BIOME="$FORK_DIR/node_modules/.bin/biome"

cd "$UPSTREAM_DIR"

# Caminhos que o fork deixou com o nome original. Ficam fora da normalização para que
# o espelho coincida com o develop nesses arquivos (ver a validação em README.md).
EXCLUDE=(
  ':(exclude)package-lock.json'
  ':(exclude).agents'
  ':(exclude).opencode'
  ':(exclude).devcontainer'
  ':(exclude).well-known'
  ':(exclude)apps/remix/public/.well-known'
  ':(exclude)packages/assets/documenso-supporter-pledge.pdf'
)

# 1. Pacote publicado sob escopo próprio do upstream. O fork usa o pacote público
#    sem escopo, porque a build com escopo @documenso não existe no registry público.
git ls-files -z -- '*package.json' | xargs -0 perl -pi -e \
  's{"\@documenso/skia-canvas"}{"skia-canvas"}g; s{\^3\.0\.8-documenso\.3}{^3.0.8}g'

# 2. Texto: documenso → bchatsign, preservando a caixa.
#    @documenso/nodemailer-resend fica como está: o fork mantém esse pacote no escopo original.
git grep -Il -z -i documenso -- . "${EXCLUDE[@]}" | xargs -0 perl -pi -e \
  's{(\@documenso/nodemailer-resend)|documenso|Documenso|DOCUMENSO}{
     defined $1 ? $1 : $& eq "documenso" ? "bchatsign" : $& eq "Documenso" ? "Bchatsign" : "BCHATSIGN"
   }ge'

# 3. Caminhos com documenso no nome.
while IFS= read -r f; do
  new="$(printf '%s' "$f" | perl -pe 's/documenso/bchatsign/gi')"
  mkdir -p "$(dirname "$new")"
  git mv "$f" "$new"
done < <(git ls-files -- . "${EXCLUDE[@]}" | perl -ne 'print if /documenso/i')

# 4. Formatação, organização de imports e correções seguras do linter (ex.: ordenação de
#    classes Tailwind) com o biome do fork, como no commit 7648b0a67.
if [ "${NORMALIZE_FORMAT:-1}" = 1 ]; then
  "$BIOME" check --write --config-path="$FORK_DIR" . >&2
fi

# 5. Guarda: nenhum documenso fora das exceções conhecidas.
leftover="$(git grep -Iin documenso -- . "${EXCLUDE[@]}" | grep -v '@documenso/nodemailer-resend' || true)"
if [ -n "$leftover" ]; then
  echo "normalize: sobrou 'documenso' fora das exceções:" >&2
  echo "$leftover" | head -20 >&2
  exit 1
fi
