#!/usr/bin/env bash
set -euo pipefail

# Build e Push para GitHub Container Registry (ghcr.io)
# Plataforma: linux/amd64 (fixo)
#
# Uso:
#   ./scripts/build-push.sh                    # build linux/amd64 + push para ghcr.io
#   ./scripts/build-push.sh --load             # build linux/amd64 + load local (sem push)
#   ./scripts/build-push.sh --no-cache         # build sem cache
#   ./scripts/build-push.sh --dry-run          # build + salva tar em /tmp (sem push, sem load)
#
# Imagens geradas (push):
#   ghcr.io/<namespace>/<image>:<branch>        ex: develop
#   ghcr.io/<namespace>/<image>:sha-<7chars>    ex: sha-550edc8
#   ghcr.io/<namespace>/<image>:latest          apenas em main|master|release
#
# Variaveis de ambiente:
#   GHCR_NAMESPACE    namespace no ghcr.io    (default: ericocesar)
#   IMAGE_NAME        nome da imagem          (default: bchatsign)
#   DOCKERFILE        caminho do Dockerfile   (default: docker/Dockerfile)
#   GHCR_TOKEN        token para docker login (opcional se ja logado)
#   NEXT_PRIVATE_TELEMETRY_KEY  build-arg opcional passado ao Dockerfile
#   NEXT_PRIVATE_TELEMETRY_HOST build-arg opcional passado ao Dockerfile
#
# Requisitos:
#   - Docker daemon com buildx
#   - Para push: autenticado no ghcr.io ou GHCR_TOKEN definido
#     export GHCR_TOKEN=ghp_xxx
#     echo "$GHCR_TOKEN" | docker login ghcr.io -u ericocesar --password-stdin

# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------
REGISTRY="ghcr.io"
NAMESPACE="${GHCR_NAMESPACE:-ericocesar}"
IMAGE_NAME="${IMAGE_NAME:-bchatsign}"
IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"
PLATFORM="linux/amd64"
DOCKERFILE_PATH="${DOCKERFILE:-docker/Dockerfile}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
NO_CACHE=false
LOAD_LOCAL=false
DRY_RUN=false

usage() {
  awk '
    /^# Build e Push/ { p=1 }
    p && /^$/ { exit }
    p { sub(/^# ?/, ""); print }
  ' "$0"
  exit "${1:-0}"
}

for arg in "$@"; do
  case "${arg}" in
    --no-cache) NO_CACHE=true ;;
    --load)     LOAD_LOCAL=true ;;
    --dry-run)  DRY_RUN=true ;;
    -h|--help)  usage 0 ;;
    *)
      echo "Flag desconhecida: ${arg}" >&2
      usage 1
      ;;
  esac
done

if [ "${LOAD_LOCAL}" = true ] && [ "${DRY_RUN}" = true ]; then
  echo "❌ --load e --dry-run sao mutuamente exclusivos." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------
GIT_SHA_SHORT="$(git rev-parse --short=7 HEAD)"
BRANCH_RAW="$(git rev-parse --abbrev-ref HEAD)"
if [ "${BRANCH_RAW}" = "HEAD" ]; then
  BRANCH_RAW="$(git describe --tags --exact-match 2>/dev/null || echo "detached")"
fi
BRANCH="$(printf '%s' "${BRANCH_RAW}" | tr '[:upper:]' '[:lower:]' | tr '/' '-')"
TAG_SHA="sha-${GIT_SHA_SHORT}"
TAG_BRANCH="${BRANCH}"
ADD_LATEST=false
case "${BRANCH_RAW}" in
  main|master|release) ADD_LATEST=true ;;
esac

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo "============================================="
echo "  Build Docker → GHCR (linux/amd64)"
echo "============================================="
echo "Registry:    ${REGISTRY}"
echo "Namespace:   ${NAMESPACE}"
echo "Imagem:      ${IMAGE}"
echo "Dockerfile:  ${DOCKERFILE_PATH}"
echo "Branch:      ${BRANCH_RAW}"
echo "Plataforma:  ${PLATFORM}"
echo "Tags:        ${TAG_BRANCH}, ${TAG_SHA}$([ "${ADD_LATEST}" = true ] && echo ", latest")"
echo "Cache:       $([ "${NO_CACHE}" = true ] && echo 'DESABILITADO' || echo 'habilitado')"
if [ "${LOAD_LOCAL}" = true ]; then
  echo "Modo:        load local (sem push)"
elif [ "${DRY_RUN}" = true ]; then
  echo "Modo:        dry-run (tar em /tmp)"
else
  echo "Modo:        push para ${REGISTRY}"
fi
echo "============================================="

# ---------------------------------------------------------------------------
# 0. Pre-requisitos
# ---------------------------------------------------------------------------
echo ""
echo ">>> [0/3] Verificando Docker e buildx..."

if ! docker info &> /dev/null; then
  echo "  ❌ Docker daemon nao esta rodando." >&2
  exit 1
fi
echo "    ✓ Docker OK"

if ! docker buildx version &> /dev/null; then
  echo "  ❌ docker buildx nao encontrado." >&2
  exit 1
fi
echo "    ✓ Buildx OK"

# Para build single-platform, o builder default 'docker' ja serve.
# Garantimos que ele esta ativo, criando se preciso.
if ! docker buildx ls 2>/dev/null | awk '/^\*/{exit 0} END{exit 1}'; then
  docker buildx use default &> /dev/null \
    || docker buildx create --use --name default &> /dev/null
fi
echo "    ✓ Builder ativo: $(docker buildx ls 2>/dev/null | awk '/^\*/{print $2; exit}')"

if [ ! -f "${DOCKERFILE_PATH}" ]; then
  echo "  ❌ Dockerfile nao encontrado: ${DOCKERFILE_PATH}" >&2
  exit 1
fi
echo "    ✓ Dockerfile OK"

# ---------------------------------------------------------------------------
# 1. Login no GHCR (somente se for fazer push)
# ---------------------------------------------------------------------------
if [ "${LOAD_LOCAL}" = false ] && [ "${DRY_RUN}" = false ]; then
  echo ""
  echo ">>> [1/3] Autenticacao no ${REGISTRY}..."

  # Primeiro tenta um login "no-op" para detectar sessao ja ativa.
  # docker login <reg> re-escreve o config, entao usamos uma checagem leve:
  if [ -n "${GHCR_TOKEN:-}" ]; then
    echo "    → Fazendo login com GHCR_TOKEN..."
    echo "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${NAMESPACE}" --password-stdin
    echo "    ✓ Login realizado."
  elif docker login "${REGISTRY}" 2>&1 | grep -qE "Login Succeeded|Already logged in"; then
    echo "    ✓ Ja autenticado no ${REGISTRY}."
  else
    echo "  ❌ Nao autenticado e GHCR_TOKEN nao definido." >&2
    echo "     Rode antes:" >&2
    echo "       export GHCR_TOKEN=ghp_xxx" >&2
    echo "       echo \"\$GHCR_TOKEN\" | docker login ${REGISTRY} -u ${NAMESPACE} --password-stdin" >&2
    exit 1
  fi
else
  echo ""
  if [ "${LOAD_LOCAL}" = true ]; then
    echo ">>> [1/3] Login desnecessario (load local) — pulando."
  else
    echo ">>> [1/3] Login desnecessario (dry-run) — pulando."
  fi
fi

# ---------------------------------------------------------------------------
# 2. Build
# ---------------------------------------------------------------------------
echo ""
echo ">>> [2/3] Build da imagem (${PLATFORM})..."

TAG_ARGS=(-t "${IMAGE}:${TAG_BRANCH}" -t "${IMAGE}:${TAG_SHA}")
if [ "${ADD_LATEST}" = true ]; then
  TAG_ARGS+=(-t "${IMAGE}:latest")
fi

CACHE_ARGS=()
[ "${NO_CACHE}" = true ] && CACHE_ARGS+=(--no-cache)

OUTPUT_MODE="--push"
LOCAL_TAG=""
if [ "${DRY_RUN}" = true ]; then
  TARBALL="/tmp/${IMAGE_NAME}-${TAG_SHA}.tar"
  OUTPUT_MODE="--output type=tar,dest=${TARBALL}"
elif [ "${LOAD_LOCAL}" = true ]; then
  # buildx nao suporta --load junto com multiplas tags de remote.
  # Carregamos a imagem localmente com uma tag ":local" para uso/teste.
  TAG_ARGS=(-t "${IMAGE}:local")
  OUTPUT_MODE="--load"
  LOCAL_TAG="${IMAGE}:local"
fi

# shellcheck disable=SC2086
docker buildx build \
  --platform "${PLATFORM}" \
  --progress=plain \
  --build-arg NEXT_PRIVATE_TELEMETRY_KEY="${NEXT_PRIVATE_TELEMETRY_KEY:-}" \
  --build-arg NEXT_PRIVATE_TELEMETRY_HOST="${NEXT_PRIVATE_TELEMETRY_HOST:-}" \
  "${CACHE_ARGS[@]}" \
  "${TAG_ARGS[@]}" \
  ${OUTPUT_MODE} \
  -f "${DOCKERFILE_PATH}" \
  "${ROOT_DIR}"

# ---------------------------------------------------------------------------
# 3. Resumo
# ---------------------------------------------------------------------------
echo ""
echo ">>> [3/3] Concluido"
echo "============================================="
if [ "${DRY_RUN}" = true ]; then
  echo "  ✅ Build dry-run concluido!"
  echo "  Tarball: ${TARBALL}"
  echo "  Para carregar: docker load -i ${TARBALL}"
elif [ "${LOAD_LOCAL}" = true ]; then
  echo "  ✅ Build local concluido!"
  echo "  Imagem disponivel em: ${LOCAL_TAG}"
  echo "  Para inspecionar:    docker run --rm -it ${LOCAL_TAG} sh"
else
  echo "  ✅ Push concluido!"
  echo "  Imagens no ${REGISTRY}:"
  echo "    ${IMAGE}:${TAG_BRANCH}"
  echo "    ${IMAGE}:${TAG_SHA}"
  if [ "${ADD_LATEST}" = true ]; then
    echo "    ${IMAGE}:latest"
  fi
  echo ""
  echo "  Para usar:"
  echo "    docker pull ${IMAGE}:${TAG_BRANCH}"
fi
echo "============================================="
