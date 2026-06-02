#!/usr/bin/env bash
set -euo pipefail

# Build e Push para GitHub Container Registry (ghcr.io)
#
# Uso:
#   ./scripts/build-push.sh                    # build linux/amd64 + push para ghcr.io
#   ./scripts/build-push.sh --local            # build linux/arm64 para Mac local, sem push
#   ./scripts/build-push.sh --build-only       # build linux/amd64 sem push
#   ./scripts/build-push.sh --no-cache         # build sem cache
#   ./scripts/build-push.sh --processor         # inclui processor (frontend + flow + processor)
#   ./scripts/build-push.sh --processor --local # build local de todos os 3 servicos
#   ./scripts/build-push.sh --frontend-only
#   ./scripts/build-push.sh --flow-only
#   ./scripts/build-push.sh --processor-only
#
# Imagens geradas:
#   ghcr.io/ericocesar/evo-crm-community-frontend:<branch>
#   ghcr.io/ericocesar/evo-crm-community-frontend:sha-<7chars>
#   ghcr.io/ericocesar/evo-crm-community-flow:<branch>
#   ghcr.io/ericocesar/evo-crm-community-flow:sha-<7chars>
#   ghcr.io/ericocesar/evo-ai-processor-community:latest
#   local/evo-frontend:custom  (tag local)
#
# Requisitos:
#   - Docker daemon com buildx (docker buildx create --use --name multiplatform)
#   - Autenticacao no ghcr.io (para push):
#     export GHCR_TOKEN=ghp_xxx
#     echo "$GHCR_TOKEN" | docker login ghcr.io -u ericocesar --password-stdin

# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------
REGISTRY="ghcr.io"
NAMESPACE="ericocesar"
IMAGE_FRONTEND="${REGISTRY}/${NAMESPACE}/evo-crm-community-frontend"
IMAGE_FLOW="${REGISTRY}/${NAMESPACE}/evo-crm-community-flow"
IMAGE_PROCESSOR="${REGISTRY}/${NAMESPACE}/evo-ai-processor-community"
LOCAL_FRONTEND_TAG="local/evo-frontend:custom"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
NO_CACHE=false
BUILD_FRONTEND=true
BUILD_FLOW=true
BUILD_PROCESSOR=false
PUSH=true
LOCAL_MODE=false
PLATFORM="linux/amd64"

for arg in "$@"; do
  case "${arg}" in
    --no-cache)       NO_CACHE=true ;;
    --frontend-only)  BUILD_FLOW=false; BUILD_PROCESSOR=false ;;
    --flow-only)      BUILD_FRONTEND=false; BUILD_PROCESSOR=false ;;
    --processor-only) BUILD_FRONTEND=false; BUILD_FLOW=false; BUILD_PROCESSOR=true ;;
    --processor)      BUILD_PROCESSOR=true ;;
    --build-only)     PUSH=false ;;
    --local)          LOCAL_MODE=true; PUSH=false; PLATFORM="linux/arm64" ;;
    --amd64)          PLATFORM="linux/amd64" ;;
    --arm64)          PLATFORM="linux/arm64" ;;
  esac
done

if [ "${LOCAL_MODE}" = true ] || [ "${PUSH}" = false ]; then
  BUILDX_OUTPUT="--load"
else
  BUILDX_OUTPUT="--push"
fi

# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------
GIT_SHA_SHORT="$(git rev-parse --short=7 HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD | tr '[:upper:]' '[:lower:]' | tr '/' '-')"
TAG_SHA="sha-${GIT_SHA_SHORT}"
TAG_BRANCH="${BRANCH}"

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo "============================================="
echo "  Build Docker → GHCR"
echo "============================================="
echo "Registry:   ${REGISTRY}"
echo "Namespace:  ${NAMESPACE}"
echo "Branch:     ${BRANCH}"
echo "Platform:   ${PLATFORM}"
echo "Tags:       ${TAG_BRANCH}, ${TAG_SHA}"
echo "Push:       ${PUSH}"
echo "Local mode: ${LOCAL_MODE}"
echo "Cache:      $(${NO_CACHE} && echo 'DESABILITADO' || echo 'habilitado')"
echo ""
if [ "${BUILD_FRONTEND}" = true ]; then
  echo "  Frontend:   ${IMAGE_FRONTEND}:${TAG_SHA}"
fi
if [ "${BUILD_FLOW}" = true ]; then
  echo "  Evo-flow:   ${IMAGE_FLOW}:${TAG_SHA}"
fi
if [ "${BUILD_PROCESSOR}" = true ]; then
  echo "  Processor:  ${IMAGE_PROCESSOR}:latest"
fi
echo "============================================="

# ---------------------------------------------------------------------------
# 0. Pre-requisitos
# ---------------------------------------------------------------------------
echo ""
echo ">>> [0/3] Verificando Docker e buildx..."

if ! docker info &> /dev/null; then
  echo "  ❌ Docker daemon nao esta rodando."
  exit 1
fi
echo "    ✓ Docker OK"

if ! docker buildx version &> /dev/null; then
  echo "  ❌ docker buildx nao encontrado. Instale o Docker Desktop ou docker-buildx."
  exit 1
fi
echo "    ✓ Buildx OK"

BUILDER_COUNT=$(docker buildx ls 2>/dev/null | grep -c "multiplatform" || echo "0")
if [ "${BUILDER_COUNT}" = "0" ] || [ "${BUILDER_COUNT}" = 0 ]; then
  echo "    → Criando builder 'multiplatform'..."
  docker buildx create --use --name multiplatform &> /dev/null || true
  echo "    ✓ Builder criado"
else
  docker buildx use multiplatform &> /dev/null || true
  echo "    ✓ Builder 'multiplatform' ativo"
fi

# ---------------------------------------------------------------------------
# 1. Login no GHCR (se for fazer push)
# ---------------------------------------------------------------------------
if [ "${PUSH}" = true ]; then
  echo ""
  echo ">>> [1/3] Autenticacao no ${REGISTRY}..."

  if docker login "${REGISTRY}" 2>&1 | grep -q "Login Succeeded"; then
    echo "    ✓ Ja autenticado no ${REGISTRY}."
  elif [[ -n "${GHCR_TOKEN:-}" ]]; then
    echo "    → Fazendo login com GHCR_TOKEN..."
    echo "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${NAMESPACE}" --password-stdin
    echo "    ✓ Login realizado."
  else
    echo "  ❌ Nao autenticado e GHCR_TOKEN nao definido."
    echo "     Rode antes:"
    echo "       export GHCR_TOKEN=ghp_xxx"
    echo "       echo \"\$GHCR_TOKEN\" | docker login ghcr.io -u ericocesar --password-stdin"
    exit 1
  fi
else
  echo ""
  echo ">>> [1/3] Login desnecessario (modo local/build-only) — pulando."
fi

# ---------------------------------------------------------------------------
# 2. Build e Push
# ---------------------------------------------------------------------------
echo ""
echo ">>> [2/3] Build das imagens..."

BUILD_ARGS=""
if [ "${NO_CACHE}" = true ]; then
  BUILD_ARGS="--no-cache"
fi

build_and_push() {
  local name="$1"
  local context="$2"
  local image_remote="$3"
  local local_tag="$4"

  echo ""
  echo "  → [${name}] Contexto: ${context}  |  Platform: ${PLATFORM}"

  TAGS=(-t "${image_remote}:${TAG_BRANCH}" -t "${image_remote}:${TAG_SHA}")

  # Tag local so em modo --load (nao pode ir pro registry)
  if [ "${PUSH}" = false ] && [ -n "${local_tag}" ]; then
    TAGS+=(-t "${local_tag}")
  fi

  # shellcheck disable=SC2086
  docker buildx build \
    --platform "${PLATFORM}" \
    ${BUILD_ARGS} \
    "${TAGS[@]}" \
    ${BUILDX_OUTPUT} \
    "${context}"

  if [ "${PUSH}" = true ]; then
    echo "    ✓ Push concluido:"
    echo "      ${image_remote}:${TAG_BRANCH}"
    echo "      ${image_remote}:${TAG_SHA}"
  else
    echo "    ✓ Build concluido (--load)"
  fi
}

build_and_push_processor() {
  local name="$1"
  local context="$2"
  local image_remote="$3"

  echo ""
  echo "  → [${name}] Contexto: ${context}  |  Platform: ${PLATFORM}"

  # Processor usa tag latest
  # shellcheck disable=SC2086
  docker buildx build \
    --platform "${PLATFORM}" \
    ${BUILD_ARGS} \
    -t "${image_remote}:latest" \
    ${BUILDX_OUTPUT} \
    "${context}"

  if [ "${PUSH}" = true ]; then
    echo "    ✓ Push concluido:"
    echo "      ${image_remote}:latest"
  else
    echo "    ✓ Build concluido (--load)"
  fi
}

if [ "${BUILD_FRONTEND}" = true ]; then
  build_and_push \
    "frontend" \
    "./evo-ai-frontend-community" \
    "${IMAGE_FRONTEND}" \
    "${LOCAL_FRONTEND_TAG}"
fi

if [ "${BUILD_FLOW}" = true ]; then
  build_and_push \
    "evo-flow" \
    "./evo-flow" \
    "${IMAGE_FLOW}" \
    ""
fi

if [ "${BUILD_PROCESSOR}" = true ]; then
  build_and_push_processor \
    "processor" \
    "./evo-ai-processor-community" \
    "${IMAGE_PROCESSOR}"
fi

# ---------------------------------------------------------------------------
# 3. Resumo
# ---------------------------------------------------------------------------
echo ""
echo ">>> [3/3] Resumo"

if [ "${LOCAL_MODE}" = true ]; then
  echo ""
  echo "============================================="
  echo "  ✅ Build local (Mac) concluido!"
  echo "============================================="
  echo ""
  echo "  Tag local:"
  echo "    ${LOCAL_FRONTEND_TAG}"
  echo ""
  if [ "${BUILD_FLOW}" = true ]; then
    echo "  Imagens carregadas no Docker local."
  fi
  echo "============================================="
  exit 0
fi

echo ""
echo "============================================="
echo "  ✅ Build concluido!"
echo "============================================="
echo ""
if [ "${PUSH}" = true ]; then
  echo "Imagens no GHCR (https://ghcr.io/${NAMESPACE}):"
  echo ""
  if [ "${BUILD_FRONTEND}" = true ]; then
    echo "  Frontend:"
    echo "    ${IMAGE_FRONTEND}:${TAG_BRANCH}"
    echo "    ${IMAGE_FRONTEND}:${TAG_SHA}"
    echo ""
  fi
  if [ "${BUILD_FLOW}" = true ]; then
    echo "  Evo-flow:"
    echo "    ${IMAGE_FLOW}:${TAG_BRANCH}"
    echo "    ${IMAGE_FLOW}:${TAG_SHA}"
    echo ""
  fi
  if [ "${BUILD_PROCESSOR}" = true ]; then
    echo "  Processor:"
    echo "    ${IMAGE_PROCESSOR}:latest"
    echo ""
  fi
  echo "  Para atualizar no servidor:"
  echo "    docker stack deploy -c .github/infra/prod-swarm.evo.yaml crmbchat --with-registry-auth"
fi
echo "============================================="
