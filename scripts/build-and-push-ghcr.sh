#!/usr/bin/env bash
set -euo pipefail

# [ai-context agent devops] Configurações de imagem e plataforma
REGISTRY="${REGISTRY:-ghcr.io}"
PLATFORM="${PLATFORM:-linux/amd64}" # Fixado para linux/amd64 por padrão (override via env)
# Dockerfile canônico do monorepo (docker/Dockerfile). Permite override via DOCKERFILE env.
DOCKERFILE="${DOCKERFILE:-docker/Dockerfile}"

sanitize_component() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's#^[^a-z0-9]+##; s#[^a-z0-9._-]+#-#g; s#-+#-#g; s#[-._]+$##'
}

detect_project_name() {
  local name=""
  local root_dir
  root_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  if [[ -f "${root_dir}/package.json" ]]; then
    name="$(sed -nE 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "${root_dir}/package.json" | head -n1)"
  fi

  if [[ -z "${name}" ]]; then
    name="$(basename "${root_dir}")"
  fi

  # Se vier no formato "@scope/name", usa apenas o nome final
  name="${name##*/}"
  sanitize_component "${name}"
}

detect_namespace() {
  local namespace=""
  local remote_url=""

  if [[ -n "${IMAGE_NAMESPACE:-}" ]]; then
    namespace="${IMAGE_NAMESPACE}"
  elif [[ -n "${GITHUB_REPOSITORY_OWNER:-}" ]]; then
    namespace="${GITHUB_REPOSITORY_OWNER}"
  elif [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    namespace="${GITHUB_REPOSITORY%%/*}"
  else
    remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
    if [[ -n "${remote_url}" ]]; then
      namespace="$(echo "${remote_url}" | sed -E 's#(git@|https?://|ssh://git@)?[^/:]+[:/]([^/]+)/.*#\2#')"
    fi
  fi

  if [[ -z "${namespace}" ]]; then
    namespace="$(whoami)"
  fi

  sanitize_component "${namespace}"
}

PROJECT_NAME_RESOLVED="$(detect_project_name)"
IMAGE_NAMESPACE_RESOLVED="$(detect_namespace)"
IMAGE_NAME="${IMAGE_NAME:-${IMAGE_NAMESPACE_RESOLVED}/${PROJECT_NAME_RESOLVED}}"

GIT_SHA_SHORT="$(git rev-parse --short=7 HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD | tr '[:upper:]' '[:lower:]' | tr '/' '-')"
TAG_SHA="sha-${GIT_SHA_SHORT}"
TAG_BRANCH="${BRANCH}"

IMAGE="${REGISTRY}/${IMAGE_NAME}"

echo "============================================="
echo "  Build and Push Docker"
echo "============================================="
echo "Registry:   ${REGISTRY}"
echo "Image:      ${IMAGE}"
echo "Project:    ${PROJECT_NAME_RESOLVED}"
echo "Namespace:  ${IMAGE_NAMESPACE_RESOLVED}"
echo "Platform:   ${PLATFORM}"
echo "Dockerfile: ${DOCKERFILE}"
echo "Tags:       ${TAG_BRANCH}, ${TAG_SHA}"
echo "============================================="

if [[ ! -f "${DOCKERFILE}" ]]; then
  echo ""
  echo "============================================="
  echo "  ❌ Dockerfile não encontrado: ${DOCKERFILE}"
  echo "============================================="
  echo "  Esperado: docker/Dockerfile (canônico do monorepo)."
  echo "  Override: DOCKERFILE=apps/remix/Dockerfile ./scripts/build-and-push-ghcr.sh"
  exit 1
fi

# ---------------------------------------------------
# -1. Gate de qualidade local (repo usa npm, não pnpm)
# ---------------------------------------------------
echo ""
echo ">>> Instalando dependências e rodando lint/build (gate local)..."

# Em Macs com libvips global (ex.: brew install vips), o sharp tenta compilar
# do source e falha ("Please add node-addon-api..."). Força o binário prebuilt.
export SHARP_IGNORE_GLOBAL_LIBVIPS=1

if [[ -f "package-lock.json" ]]; then
  npm ci
else
  npm install
fi
npm run lint
# typecheck/test são opcionais: só rodam se o script existir no package.json raiz
if npm run | grep -qE '^\s+typecheck(\s|$)'; then
  npm run typecheck
else
  echo "    (skip) script 'typecheck' não existe na raiz — coberto por 'npm run build' (turbo + tsc no apps/remix)."
fi
if npm run | grep -qE '^\s+test(\s|$)'; then
  npm run test
else
  echo "    (skip) script 'test' não existe na raiz."
fi
npm run build

echo "    ✓ Lint/build OK."

if ! command -v gitleaks &> /dev/null; then
  echo ""
  echo "  ⚠️  Gitleaks não encontrado. Instale com:"
  echo "     brew install gitleaks"
  echo ""
  echo "  Abortando build por segurança."
  exit 1
fi

# ---------------------------------------------------
# 0. [ai-context devops] Commit e push das alterações
# ---------------------------------------------------
echo ""
echo ">>> Verificando status do Git..."

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "  ⚠️  Este diretório não é um repositório Git. Pulando commit/push."
else
  if git diff --quiet && git diff --cached --quiet; then
    echo "    ✓ Não há alterações para commitar."
  else
    echo "    → Fazendo commit das alterações..."

    mkdir -p docs/historico
    git add docs/historico/latest-tag docs/historico/latest-digest docs/historico/latest-image docs/historico/build-info.json 2>/dev/null || true
    
    COMMIT_MSG="chore: build ${PROJECT_NAME_RESOLVED}:${TAG_SHA}"
    git commit -m "${COMMIT_MSG}" || echo "    ⚠️  Nada para commitar (já está sincronizado)"

    echo ""
    echo ">>> Rodando Gitleaks nos commits que serão enviados (gate local, substitui security-secrets.yml)..."
    GITLEAKS_RANGE="HEAD"
    LAST_PUSHED_SHA="$(git rev-parse "@{upstream}" 2>/dev/null || true)"
    if [[ -n "${LAST_PUSHED_SHA}" ]]; then
      GITLEAKS_RANGE="${LAST_PUSHED_SHA}..HEAD"
    fi
    if ! gitleaks git --no-banner --redact --exit-code 1 --log-opts="${GITLEAKS_RANGE}"; then
      echo ""
      echo "============================================="
      echo "  ❌ Gitleaks encontrou possíveis segredos expostos! Push abortado."
      echo "============================================="
      exit 1
    fi
    echo "    ✓ Nenhum segredo encontrado pelo Gitleaks."

    echo "    → Fazendo push para o remote..."
    CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    git push origin "${CURRENT_BRANCH}" 2>/dev/null || git push origin main 2>/dev/null || echo "    ⚠️  Push falhou ou não há remote configurado"
    
    echo "    ✓ Commit e push concluídos."
  fi
  
  GIT_SHA_SHORT="$(git rev-parse --short=7 HEAD)"
  TAG_SHA="sha-${GIT_SHA_SHORT}"
  
  if git diff --quiet && git diff --cached --quiet; then
    : 
  else
    echo "    Tags atualizadas: ${TAG_BRANCH}, ${TAG_SHA}"
  fi
fi

# ---------------------------------------------------
# 1. [ai-context security] Verificação de segurança com Trivy (pré-build)
# ---------------------------------------------------
echo ""
echo ">>> Executando varredura de segurança com Trivy..."

if ! command -v trivy &> /dev/null; then
  echo ""
  echo "  ⚠️  Trivy não encontrado. Instale com:"
  echo "     brew install aquasecurity/trivy/trivy"
  echo ""
  echo "  Abortando build por segurança."
  exit 1
fi

TRIVY_EXIT_CODE=0
trivy fs \
  --scanners misconfig,vuln \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  --skip-version-check \
  --skip-dirs '.git,.venv,node_modules,.mimocode,dist,build,backups,.context,.turbo,.pytest_cache,.extracted,.agent,.agents,.claude,.worktrees,.dbg,.gemini,.trae,.vscode,scratch,public' \
  . || TRIVY_EXIT_CODE=$?

if [[ "${TRIVY_EXIT_CODE}" -ne 0 ]]; then
  echo ""
  echo "============================================="
  echo "  ❌ Trivy encontrou vulnerabilidades HIGH/CRITICAL!"
  echo "============================================="
  echo ""
  echo "  Por favor, corrija as vulnerabilidades antes de fazer o build."
  echo "  Para ver detalhes completos, execute:"
  echo ""
  echo "     trivy fs --scanners misconfig,vuln --severity HIGH,CRITICAL ."
  echo ""
  echo "  Dicas de correção:"
  echo "    - Dependências npm:  npm update <pacote> ou ajuste a versão em package.json"
  echo "    - Dockerfile:        adicione USER <non-root> no Dockerfile"
  echo ""
  echo "  Para ignorar uma vulnerabilidade específica (caso seja falso positivo),"
  echo "  crie um arquivo .trivyignore na raiz do projeto com os CVE IDs."
  echo "============================================="
  exit 1
fi

echo "    ✓ Nenhuma vulnerabilidade HIGH/CRITICAL encontrada."

# ---------------------------------------------------
# 2. Verificações de ambiente
# ---------------------------------------------------

# Verifica se o Docker está rodando
if ! docker system info > /dev/null 2>&1; then
  echo "Docker não está rodando."
  exit 1
fi

# Verifica login no registry (não-bloqueante interativo: usa GHCR_TOKEN se disponível)
if [[ -n "${GHCR_TOKEN:-}" && "${REGISTRY}" == "ghcr.io" ]]; then
  echo ">>> Login no ${REGISTRY} via GHCR_TOKEN..."
  echo "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${GITHUB_ACTOR:-${IMAGE_NAMESPACE_RESOLVED}}" --password-stdin
elif [[ -f "${HOME}/.docker/config.json" ]] && grep -q "${REGISTRY}" "${HOME}/.docker/config.json" 2>/dev/null; then
  echo "    ✓ Login no ${REGISTRY} detectado em ~/.docker/config.json."
else
  echo ">>> Verificando acesso ao ${REGISTRY} (docker pull de teste)..."
  if ! docker pull "hello-world" > /dev/null 2>&1; then
    : # hello-world pode não existir no registry privado; segue para push que falhará com msg clara
  fi
  echo "    ⚠️  Login no ${REGISTRY} não confirmado via config.json e GHCR_TOKEN ausente."
  echo "    Se o push falhar com 401/denied, faça login com:"
  if [[ "${REGISTRY}" == "ghcr.io" ]]; then
    echo "       echo \"\$GHCR_TOKEN\" | docker login ghcr.io -u SEU_USUARIO --password-stdin"
  else
    echo "       docker login ${REGISTRY}"
  fi
fi

# Configura o buildx builder
BUILDER_NAME="local-multi"
if ! docker buildx inspect "${BUILDER_NAME}" > /dev/null 2>&1; then
  docker buildx create --name "${BUILDER_NAME}" --use
else
  docker buildx use "${BUILDER_NAME}"
fi
docker buildx inspect --bootstrap > /dev/null

# ---------------------------------------------------
# 3. Build local (apenas linux/amd64)
# ---------------------------------------------------
echo ""
echo ">>> Building Docker image (${PLATFORM}) locally (Dockerfile: ${DOCKERFILE})..."

docker buildx build \
  --platform "${PLATFORM}" \
  --load \
  -f "${DOCKERFILE}" \
  -t "${IMAGE}:${TAG_BRANCH}" \
  -t "${IMAGE}:${TAG_SHA}" \
  --build-arg NEXT_PRIVATE_TELEMETRY_KEY="${NEXT_PRIVATE_TELEMETRY_KEY:-}" \
  --build-arg NEXT_PRIVATE_TELEMETRY_HOST="${NEXT_PRIVATE_TELEMETRY_HOST:-}" \
  .

echo "    ✓ Imagem construída localmente para ${PLATFORM}:"
echo "      - ${IMAGE}:${TAG_BRANCH}"
echo "      - ${IMAGE}:${TAG_SHA}"

# ---------------------------------------------------
# 4. Push para o registry
# ---------------------------------------------------
echo ""
echo ">>> Fazendo push para ${REGISTRY}..."

docker push "${IMAGE}:${TAG_BRANCH}"
docker push "${IMAGE}:${TAG_SHA}"

echo "    ✓ Push concluído:"
echo "      - ${IMAGE}:${TAG_BRANCH}"
echo "      - ${IMAGE}:${TAG_SHA}"

IMAGE_DIGEST_FULL="$(docker inspect --format='{{index .RepoDigests 0}}' "${IMAGE}:${TAG_SHA}")"
IMAGE_DIGEST_VALUE="${IMAGE_DIGEST_FULL#*@}"
HISTORY_DIR="docs/historico"
mkdir -p "${HISTORY_DIR}"
DIGEST_FILE="${HISTORY_DIR}/latest-digest"
TAG_FILE="${HISTORY_DIR}/latest-tag"
IMAGE_FILE="${HISTORY_DIR}/latest-image"
BUILD_INFO_FILE="${HISTORY_DIR}/build-info.json"
echo "${IMAGE_DIGEST_VALUE}" > "${DIGEST_FILE}"
echo "${TAG_SHA}" > "${TAG_FILE}"
echo "${IMAGE}" > "${IMAGE_FILE}"
GIT_SHA_FULL="$(git rev-parse HEAD)"
cat > "${BUILD_INFO_FILE}" <<EOF
{
  "image": "${IMAGE}",
  "tag_sha": "${TAG_SHA}",
  "tag_branch": "${TAG_BRANCH}",
  "digest": "${IMAGE_DIGEST_VALUE}",
  "git_sha": "${GIT_SHA_FULL}",
  "platform": "${PLATFORM}",
  "dockerfile": "${DOCKERFILE}"
}
EOF

echo ""
echo "============================================="
echo "  Build and Push concluído!"
echo "============================================="
echo ""
echo "Imagem disponível: ${IMAGE}:${TAG_SHA}"
echo "Digest imutável:   ${IMAGE_DIGEST_VALUE}"
echo ""
echo "Para fazer deploy no Portainer (digest lido de ${DIGEST_FILE}):"
echo "  npm run deploy:dev"
echo "  npm run deploy:prod"
echo "  IMAGE_DIGEST=\$(cat ${DIGEST_FILE}) ./scripts/deployportainer.sh dev"
echo "(o digest é lido automaticamente de ${DIGEST_FILE})"
echo "============================================="
