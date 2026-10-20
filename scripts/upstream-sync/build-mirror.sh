#!/usr/bin/env bash
# Gera o espelho normalizado do upstream: um commit por release, encadeado a partir da base.
#
# Uso: build-mirror.sh <raiz-do-fork> <sha-merge-base> <tag-upstream>...
#   ex.: build-mirror.sh . c50a01d00 v2.12.0 v2.13.0 ... v2.21.0
#
# Resultado: branch vendor/upstream-bchatsign e tags mirror/base e mirror/<tag>.
# Cada commit tem a árvore produzida por normalize.sh e o trailer Upstream-Commit.
# A execução é repetível: commits já existentes são reaproveitados.
set -euo pipefail

FORK_DIR="${1:?uso: build-mirror.sh <raiz-do-fork> <sha-merge-base> <tag>...}"
BASE_SHA="${2:?informe o merge-base}"
shift 2
[ "$#" -gt 0 ] || { echo "informe ao menos uma tag do upstream" >&2; exit 1; }

HERE="$(cd "$(dirname "$0")" && pwd)"
NORMALIZE="$HERE/normalize.sh"
BRANCH="vendor/upstream-bchatsign"

git_fork() { git -C "$FORK_DIR" "$@"; }

# Árvore normalizada de um commit do upstream, sem tocar na working tree do fork.
normalized_tree() {
  local ref="$1" wt tree
  wt="$(mktemp -d)"
  git_fork worktree add --quiet --detach "$wt" "$ref"
  "$NORMALIZE" "$wt" "$FORK_DIR"
  tree="$(git -C "$wt" add -A && git -C "$wt" write-tree)"
  git_fork worktree remove --force "$wt"
  echo "$tree"
}

# Cria o commit espelho de um ref, ou reaproveita o que já existe em mirror/<name>.
# Imprime o sha do commit. Toda saída de diagnóstico vai para stderr.
mirror_commit() {
  local name="$1" ref="$2" parent="$3" sha tree commit
  if commit="$(git_fork rev-parse --verify -q "refs/tags/mirror/$name^{commit}")"; then
    echo "$commit"
    return
  fi
  sha="$(git_fork rev-parse --verify "$ref^{commit}")"
  tree="$(normalized_tree "$sha")"
  commit="$(git_fork commit-tree "$tree" -p "$parent" \
    -m "mirror: upstream $name normalizado" \
    -m "Upstream-Commit: $sha")"
  echo "$commit"
}

prev="$(mirror_commit base "$BASE_SHA" "$BASE_SHA")"
git_fork update-ref "refs/tags/mirror/base" "$prev"
echo "mirror/base -> $prev" >&2

for tag in "$@"; do
  prev="$(mirror_commit "$tag" "$tag" "$prev")"
  git_fork update-ref "refs/tags/mirror/$tag" "$prev"
  git_fork update-ref "refs/heads/$BRANCH" "$prev"
  echo "mirror/$tag -> $prev" >&2
done
