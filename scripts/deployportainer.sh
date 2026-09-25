#!/usr/bin/env bash
# file: scripts/deployportainer.sh
#
# Deploy unificado com gate de identidade produto x ambiente x stack x imagem x digest x endpoint.
# Deploy por digest imutável (sha256:...) — tags mutáveis (sha-xxxx, branch) não são aceitas.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IDENTITY_FILE="$REPO_ROOT/.github/infra/identity.json"
HISTORY_DIR="$REPO_ROOT/docs/historico"
DIGEST_FILE="$HISTORY_DIR/latest-digest"

usage() {
  cat <<EOF
Uso:
  ./scripts/deployportainer.sh <AMBIENTE>

Exemplos:
  ./scripts/deployportainer.sh dev
  ./scripts/deployportainer.sh prod

  npm run deploy:dev
  npm run deploy:prod

Variáveis de ambiente obrigatórias:
  PORTAINER_API_KEY   API key do Portainer (nunca versionada)
  IMAGE_DIGEST         Digest da imagem já publicada, formato sha256:<64 hex>
                      (opcional se docs/historico/latest-digest existir —
                       gerado por ./scripts/build-and-push-ghcr.sh via 'npm run push')

URL e endpoint do Portainer, nome da stack e imagem NÃO são lidos de secrets:
vêm de $IDENTITY_FILE, cópia auditada para este produto (bchatsign).
Isso impede que um secret mal configurado (ex.: PORTAINER_ENDPOINT_ID
de outro produto) aponte o deploy para a stack errada.

Arquivo obrigatório por ambiente:
  \$REPO_ROOT/.github/infra/stack-<AMBIENTE>.yml
  (imagem deve ser 'ghcr.io/ericocesar/bchatsign@\${IMAGE_DIGEST}')

Secrets do Portainer por ambiente (gitignored, nunca versionar):
  \$REPO_ROOT/.env.deploy.<AMBIENTE>
  ou \$REPO_ROOT/.github/infra/.env.deploy.<AMBIENTE>
  (legado: .github/infra/portainer.<AMBIENTE>.env — migrar para .env.deploy.*)

Dependências:
  curl
  jq
  python3
EOF
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  echo "Erro: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "comando obrigatório não encontrado: $1"
}

http_json() {
  local method="$1"
  local url="$2"
  local payload="${3:-}"

  if [ -n "$payload" ]; then
    curl -sS -w '\n%{http_code}' \
      -X "$method" \
      -H "X-API-Key: $PORTAINER_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$url"
  else
    curl -sS -w '\n%{http_code}' \
      -X "$method" \
      -H "X-API-Key: $PORTAINER_API_KEY" \
      "$url"
  fi
}

parse_http_response() {
  local raw="$1"
  HTTP_CODE="$(printf '%s\n' "$raw" | tail -n1)"
  RESPONSE_BODY="$(printf '%s\n' "$raw" | sed '$d')"
}

load_identity() {
  local env_name="$1"

  [ -f "$IDENTITY_FILE" ] || fail "identity.json ausente: $IDENTITY_FILE"

  IDENTITY_JSON="$(cat "$IDENTITY_FILE")"

  STACK_NAME="$(printf '%s' "$IDENTITY_JSON" | jq -r '.stack')"
  IDENTITY_IMAGE="$(printf '%s' "$IDENTITY_JSON" | jq -r '.image')"
  PORTAINER_URL="$(printf '%s' "$IDENTITY_JSON" | jq -r --arg e "$env_name" '.portainer[$e].url')"
  PORTAINER_ENDPOINT_ID="$(printf '%s' "$IDENTITY_JSON" | jq -r --arg e "$env_name" '.portainer[$e].endpointId // empty')"

  [ -n "$STACK_NAME" ] && [ "$STACK_NAME" != "null" ] || fail "identity.json sem .stack"
  [ -n "$IDENTITY_IMAGE" ] && [ "$IDENTITY_IMAGE" != "null" ] || fail "identity.json sem .image"

  case "$PORTAINER_URL" in
    ""|null|REPLACE_WITH*)
      fail "Portainer não validado para '$env_name' em identity.json (url='$PORTAINER_URL'). Este produto ainda não pode ser deployado nesse ambiente."
      ;;
  esac
  [ -n "$PORTAINER_ENDPOINT_ID" ] || fail "Portainer endpointId ausente para '$env_name' em identity.json"

  STACK_FILE="$REPO_ROOT/.github/infra/stack-$env_name.yml"
}

validate_required_files() {
  if [ ! -f "$STACK_FILE" ]; then
    cat >&2 <<EOF
Erro: arquivo da stack não encontrado.

Ambiente: $ENVIRONMENT
Caminho esperado: $STACK_FILE

Salve o compose da stack exatamente nesse caminho e execute novamente.
EOF
    exit 1
  fi
}

validate_credentials() {
  [ -n "${PORTAINER_API_KEY:-}" ] || fail "PORTAINER_API_KEY não definido no ambiente"
}

load_env_file() {
  local env_name="$1"
  local env_file="$REPO_ROOT/.env.deploy.${env_name}"
  # Fallback: aceita também .github/infra/.env.deploy.<AMBIENTE> (ambos gitignored).
  if [ ! -f "$env_file" ] && [ -f "$REPO_ROOT/.github/infra/.env.deploy.${env_name}" ]; then
    env_file="$REPO_ROOT/.github/infra/.env.deploy.${env_name}"
  fi
  # Compat legada: .github/infra/portainer.<AMBIENTE>.env (versionado hoje — migrar).
  if [ ! -f "$env_file" ] && [ -f "$REPO_ROOT/.github/infra/portainer.${env_name}.env" ]; then
    env_file="$REPO_ROOT/.github/infra/portainer.${env_name}.env"
    log "AVISO: usando legado $env_file — migre para .env.deploy.${env_name} (gitignored) e rotacione a API key versionada"
  fi
  [ -f "$env_file" ] || fail "arquivo não encontrado: $REPO_ROOT/.env.deploy.${env_name} (ou .github/infra/.env.deploy.${env_name}). Copie de .env.deploy.${env_name}.example e preencha PORTAINER_API_KEY."

  log "carregando secrets de $env_file"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

validate_required_secrets() {
  local missing=()
  local secret
  while IFS= read -r secret; do
    [ -z "$secret" ] && continue
    if [ -z "${!secret:-}" ]; then
      missing+=("$secret")
    fi
  done < <(printf '%s' "$IDENTITY_JSON" | jq -r '.requiredSecrets[]?')

  if [ "${#missing[@]}" -gt 0 ]; then
    fail "requiredSecrets ausentes no ambiente: ${missing[*]}"
  fi
}

validate_image_digest() {
  local digest="$1"
  [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || {
    fail "IMAGE_DIGEST inválido: '$digest'. Formato esperado: sha256:<64 hex>. Tags mutáveis não são aceitas."
  }
}

resolve_image_digest() {
  # Fallback: se IMAGE_DIGEST não veio no env, lê do digest salvo pelo
  # scripts/build-and-push-ghcr.sh em docs/historico/latest-digest.
  if [ -n "${IMAGE_DIGEST:-}" ]; then
    return 0
  fi
  if [ -n "${IMAGE_TAG:-}" ]; then
    fail "IMAGE_TAG='$IMAGE_TAG' não é mais aceito. Deploys usam digest imutável (sha256:...). Rode 'npm run push' e use docs/historico/latest-digest ou exporte IMAGE_DIGEST."
  fi
  [ -f "$DIGEST_FILE" ] || fail "IMAGE_DIGEST não definido no ambiente e $DIGEST_FILE não existe. Rode 'npm run push' primeiro."
  IMAGE_DIGEST="$(cat "$DIGEST_FILE")"
  log "IMAGE_DIGEST lido de $DIGEST_FILE: $IMAGE_DIGEST"
  export IMAGE_DIGEST
}

validate_stack_matches_identity() {
  local stack_file="$1"

  grep -q '\${IMAGE_DIGEST}' "$stack_file" || {
    fail "o arquivo $stack_file deve referenciar \${IMAGE_DIGEST} em pelo menos uma linha image:"
  }

  grep -q "image: ${IDENTITY_IMAGE}@\${IMAGE_DIGEST}" "$stack_file" || {
    fail "a imagem declarada em $stack_file não corresponde a '$IDENTITY_IMAGE' (identity.json). Stack de outro produto?"
  }
}

render_stack_content() {
  local stack_file="$1"
  local image_digest="$2"

  IMAGE_DIGEST_VALUE="$image_digest" STACK_FILE_RENDER="$stack_file" python3 - <<'PY'
import os
from pathlib import Path

stack_file = Path(os.environ["STACK_FILE_RENDER"])
image_digest = os.environ["IMAGE_DIGEST_VALUE"]

content = stack_file.read_text(encoding="utf-8")
content = content.replace("${IMAGE_DIGEST}", image_digest)

print(content, end="")
PY
}

stack_env_json() {
  local stack_file="$1"

  STACK_FILE_TO_PARSE="$stack_file" python3 - <<'PY'
import json
import os
import re
from pathlib import Path

content = Path(os.environ["STACK_FILE_TO_PARSE"]).read_text(encoding="utf-8")
entries = []
pattern = re.compile(r"^\s*-\s*([A-Za-z_][A-Za-z0-9_]*)=\$\{([A-Za-z_][A-Za-z0-9_]*)\}\s*$")

for line in content.splitlines():
    match = pattern.match(line)
    if not match:
        continue
    # O nome exposto pelo container pode ser um alias do secret do runner
    # (por exemplo, MINIO_ACCESS_KEY <- OBJECT_STORAGE_ACCESS_KEY_ID).
    stack_name, env_name = match.groups()
    if env_name not in os.environ:
        raise SystemExit(f"required stack secret is missing from the runner environment: {env_name}")
    entries.append({"name": stack_name, "value": os.environ[env_name]})

print(json.dumps(entries), end="")
PY
}

show_rendered_image_lines() {
  local rendered="$1"

  log "linhas image: renderizadas:"
  printf '%s\n' "$rendered" | awk '
    /^[[:space:]]*image:[[:space:]]*/ { print "  " $0 }
  '
}

# --- migration via Portainer exec API ----------------------------------------
#
# Roda 'prisma migrate deploy' num container já em execução na stack,
# usando apenas a API do Portainer (sem SSH no servidor, sem docker run local).
# Layout real da imagem (docker/Dockerfile, WORKDIR /app/apps/remix):
#   schema em /app/packages/prisma/schema.prisma
#   datasource url = env("NEXT_PRIVATE_DATABASE_URL")
# Requer que o container esteja em execução e que já tenha
# NEXT_PRIVATE_DATABASE_URL no env
# (a stack-dev.yml/stack-prod.yml já injetam no serviço bchatsign).
#
# Nota: docker/start.sh já roda 'prisma migrate deploy' no boot; este exec é
# uma garantia explícita pós-update (falha o deploy se migration falhar).
#
# Ordem no fluxo: stack create/update acontece primeiro; aqui esperamos o
# container subir e disparamos o exec.

find_app_container_id() {
  local namespace="$1"
  local image="$2"
  local max_wait="${3:-180}"
  local elapsed=0

  local filter_json
  filter_json="$(jq -n --arg ns "$namespace" '{label: ["com.docker.stack.namespace=" + $ns]}')"
  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/json"

  while [ "$elapsed" -lt "$max_wait" ]; do
    local raw
    raw="$(
      curl -sS -G -w '\n%{http_code}' \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        --data-urlencode "all=1" \
        --data-urlencode "filters=$filter_json" \
        "$url"
    )"
    parse_http_response "$raw"
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
      local cid
      cid="$(printf '%s' "$RESPONSE_BODY" | jq -r --arg img "$image" \
        '[.[] | select((.Image == $img) or (.Image | startswith($img + "@"))) | select(.State == "running")] | .[0].Id // empty' 2>/dev/null)"
      if [ -n "$cid" ]; then
        printf '%s' "$cid"
        return 0
      fi
    fi

    sleep 3
    elapsed=$((elapsed + 3))
  done
  return 1
}

container_exec_create() {
  local container_id="$1"
  local cmd_json="$2"

  local payload
  payload="$(
    jq -n --argjson cmd "$cmd_json" '{
      AttachStdout: true,
      AttachStderr: true,
      Cmd: $cmd,
      Tty: false
    }'
  )"

  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${container_id}/exec"
  local raw
  raw="$(http_json POST "$url" "$payload")"
  parse_http_response "$raw"

  # 409 com "is not running" é transitório durante rolling updates do Swarm:
  # o list filter viu "running" mas o container morreu/exited entre o find e
  # o exec. Caller deve re-find e re-tentar, não falhar direto.
  if [ "$HTTP_CODE" = "409" ] && printf '%s' "$RESPONSE_BODY" | grep -q 'is not running'; then
    printf '%s' "$RESPONSE_BODY" >&2
    return 9
  fi

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "falha ao criar exec instance em $container_id (HTTP $HTTP_CODE): $RESPONSE_BODY"
  }

  printf '%s' "$RESPONSE_BODY" | jq -r '.Id // empty'
}

verify_container_running() {
  # Inspect autoritativo — confirma State.Status=running antes do exec.
  # Mais confiável que o filtro do /containers/json (que pode ter cache).
  local container_id="$1"
  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${container_id}/json"
  local raw
  raw="$(http_json GET "$url")"
  parse_http_response "$raw"
  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || return 1
  local status
  status="$(printf '%s' "$RESPONSE_BODY" | jq -r '.State.Status // empty')"
  [ "$status" = "running" ]
}

container_exec_start_detached() {
  local exec_id="$1"

  local payload='{"Detach": true, "Tty": false}'
  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/exec/${exec_id}/start"
  local raw
  raw="$(http_json POST "$url" "$payload")"
  parse_http_response "$raw"

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "falha ao iniciar exec $exec_id (HTTP $HTTP_CODE): $RESPONSE_BODY"
  }
}

container_exec_poll_exit_code() {
  local exec_id="$1"
  local max_wait="${2:-600}"
  local elapsed=0

  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/exec/${exec_id}/json"

  while [ "$elapsed" -lt "$max_wait" ]; do
    local raw info running
    raw="$(http_json GET "$url")"
    parse_http_response "$raw"
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
      info="$RESPONSE_BODY"
      running="$(printf '%s' "$info" | jq -r '.Running // false')"
      if [ "$running" = "false" ]; then
        local exit_code
        exit_code="$(printf '%s' "$info" | jq -r '.ExitCode // "1"')"
        printf '%s|%s' "$exit_code" "$info"
        return 0
      fi
    else
      # Falha de inspect: se for 404 transient, segue tentando até max_wait.
      # Caso contrário (auth, 5xx, etc), loga e falha.
      if [ "$HTTP_CODE" != "404" ] && [ "$HTTP_CODE" != "409" ]; then
        fail "falha ao inspecionar exec $exec_id (HTTP $HTTP_CODE): $RESPONSE_BODY"
      fi
      log "inspect $exec_id retornou HTTP $HTTP_CODE, tentando novamente..."
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 124  # timeout
}

container_exec_fetch_logs() {
  # Retorna multi-linha: linha 1 = "<HTTP_CODE>", linhas seguintes = body.
  # Caller decide como interpretar.
  local exec_id="$1"
  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/exec/${exec_id}/logs?stdout=true&stderr=true"
  local raw http_code body
  raw="$(
    curl -sS -w '\n%{http_code}' \
      -H "X-API-Key: $PORTAINER_API_KEY" \
      "$url" 2>/dev/null || true
  )"
  http_code="$(printf '%s\n' "$raw" | tail -n1)"
  body="$(printf '%s\n' "$raw" | sed '$d')"
  printf '%s\n%s' "$http_code" "$body"
}

run_migration_via_portainer() {
  log "rodando migration via Portainer exec API..."

  local cmd_json='["sh", "-c", "npx prisma migrate deploy --schema /app/packages/prisma/schema.prisma"]'
  local exec_id=""
  local container_id=""
  local attempt=0
  local max_attempts=5

  # Loop com re-find: durante rolling update do Swarm o container pode
  # morrer entre find e exec_create (race 409 "is not running"). Re-busca
  # e re-verifica state via inspect antes de tentar de novo.
  while [ "$attempt" -lt "$max_attempts" ]; do
    container_id="$(find_app_container_id "$STACK_NAME" "$IDENTITY_IMAGE")" || {
      fail "container da app não encontrado em execução na stack '$STACK_NAME' (imagem: $IDENTITY_IMAGE). Verifique se o stack subiu e se o healthcheck/start_period concluiu."
    }

    if ! verify_container_running "$container_id"; then
      log "container $container_id retornado pela busca mas inspect mostra state != running; re-buscando (attempt $((attempt+1))/$max_attempts)..."
      attempt=$((attempt + 1))
      sleep 3
      continue
    fi
    log "container alvo: $container_id"

    if exec_id="$(container_exec_create "$container_id" "$cmd_json" 2>/dev/null)" && [ -n "$exec_id" ]; then
      break
    fi
    local rc=$?
    if [ "$rc" = "9" ]; then
      log "exec_create recebeu 409 'is not running' — race durante rolling update; re-buscando (attempt $((attempt+1))/$max_attempts)..."
      attempt=$((attempt + 1))
      sleep 3
      continue
    fi
    fail "container_exec_create falhou (rc=$rc) em $container_id"
  done

  [ -n "$exec_id" ] || fail "não foi possível criar exec instance após $max_attempts tentativas"
  log "exec instance: $exec_id"

  container_exec_start_detached "$exec_id"
  log "migration em execução — aguardando conclusão..."

  local poll_result exit_code inspect_body
  poll_result="$(container_exec_poll_exit_code "$exec_id" 600)" || {
    log "(timeout aguardando exec; tentando buscar logs mesmo assim)"
    local logs_block
    logs_block="$(container_exec_fetch_logs "$exec_id")"
    printf '%s\n' "$logs_block"
    fail "timeout aguardando migration (600s)"
  }

  exit_code="${poll_result%%|*}"
  inspect_body="${poll_result#*|}"
  log "inspect final: exit_code=$exit_code"
  log "inspect body: $inspect_body"

  local logs_block logs_http logs_body
  logs_block="$(container_exec_fetch_logs "$exec_id")"
  logs_http="$(printf '%s\n' "$logs_block" | head -n1)"
  logs_body="$(printf '%s\n' "$logs_block" | tail -n +2)"

  if [ "$logs_http" = "200" ] && [ -n "$logs_body" ]; then
    printf '%s\n' "$logs_body" | tr -cd '\11\12\15\40-\176' || true
  else
    log "endpoint /exec/{id}/logs retornou HTTP $logs_http (provavelmente indisponível nesta versão do Portainer)"
    log "para diagnóstico manual:"
    log "  - ver stdout/stderr do container: docker service logs ${STACK_NAME}_${STACK_NAME} (no Swarm manager)"
    log "  - ou Portainer UI → Stack → ${STACK_NAME} → container → Logs"
    log "  - inspect body do exec: $inspect_body"
  fi

  if [ "$exit_code" != "0" ]; then
    fail "migration falhou (exit code $exit_code). Veja logs acima."
  fi
  log "migration concluída com sucesso (exit 0)"
}

get_swarm_id() {
  local raw
  local url="${PORTAINER_URL%/}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/swarm"

  raw="$(http_json GET "$url")"
  parse_http_response "$raw"

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "falha ao consultar Swarm no endpoint $PORTAINER_ENDPOINT_ID (HTTP $HTTP_CODE)"
  }

  local swarm_id
  swarm_id="$(printf '%s' "$RESPONSE_BODY" | jq -r '.ID // empty')"
  [ -n "$swarm_id" ] || fail "não foi possível obter o Swarm ID"

  printf '%s' "$swarm_id"
}

find_stack_id() {
  local stack_name="$1"
  local raw
  local url="${PORTAINER_URL%/}/api/stacks"

  raw="$(
    curl -sS -G -w '\n%{http_code}' \
      -H "X-API-Key: $PORTAINER_API_KEY" \
      --data-urlencode "filters={\"name\":\"${stack_name}\"}" \
      "$url"
  )"

  parse_http_response "$raw"

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "falha ao listar stacks (HTTP $HTTP_CODE)"
  }

  printf '%s' "$RESPONSE_BODY" | jq -e 'type == "array"' >/dev/null 2>&1 || {
    fail "resposta inesperada ao listar stacks"
  }

  printf '%s' "$RESPONSE_BODY" | jq -r --arg name "$stack_name" '.[] | select(.Name == $name) | .Id' | head -n1
}

create_stack() {
  local stack_name="$1"
  local stack_content="$2"
  local swarm_id="$3"
  local stack_env="$4"

  local payload
  payload="$(
    jq -n \
      --arg name "$stack_name" \
      --arg content "$stack_content" \
      --arg swarm_id "$swarm_id" \
      --argjson stack_env "$stack_env" \
      '{
        name: $name,
        stackFileContent: $content,
        swarmID: $swarm_id,
        env: $stack_env,
        fromAppTemplate: false
      }'
  )"

  local raw
  local url="${PORTAINER_URL%/}/api/stacks/create/swarm/string?endpointId=${PORTAINER_ENDPOINT_ID}"

  raw="$(http_json POST "$url" "$payload")"
  parse_http_response "$raw"

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "erro ao criar stack '$stack_name' (HTTP $HTTP_CODE)"
  }

  log "stack criada com sucesso: $stack_name"
}

update_stack() {
  local stack_id="$1"
  local stack_name="$2"
  local stack_content="$3"
  local stack_env="$4"

  local payload
  payload="$(
    jq -n \
      --arg content "$stack_content" \
      --argjson stack_env "$stack_env" \
      '{
        stackFileContent: $content,
        env: $stack_env,
        prune: true,
        pullImage: true
      }'
  )"

  local raw
  local url="${PORTAINER_URL%/}/api/stacks/${stack_id}?endpointId=${PORTAINER_ENDPOINT_ID}"

  raw="$(http_json PUT "$url" "$payload")"
  parse_http_response "$raw"

  [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] || {
    fail "erro ao atualizar stack '$stack_name' (HTTP $HTTP_CODE)"
  }

  log "stack atualizada com sucesso: $stack_name (ID ${stack_id})"
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd python3

  # Compat com CLI legada: ./deployportainer.sh {IMAGE_TAG} {AMBIENTE} [STACK]
  # (documentada no antigo doc-deploy.md). Agora o digest vem de IMAGE_DIGEST
  # ou docs/historico/latest-digest, não de arg posicional.
  if [ $# -ge 2 ]; then
    fail "uso legado detectado ('$*'). Novo uso: ./scripts/deployportainer.sh <dev|prod> com IMAGE_DIGEST no env ou docs/historico/latest-digest (gerado por 'npm run push'). Ver .github/infra/doc-deploy.md"
  fi

  if [ $# -ne 1 ]; then
    usage
    exit 1
  fi

  ENVIRONMENT="$1"
  case "$ENVIRONMENT" in
    dev|prod) ;;
    *) fail "ambiente inválido: '$ENVIRONMENT'. Use 'dev' ou 'prod'" ;;
  esac

  load_env_file "$ENVIRONMENT"
  validate_credentials
  load_identity "$ENVIRONMENT"
  validate_required_secrets
  validate_required_files
  resolve_image_digest
  validate_image_digest "${IMAGE_DIGEST:-}"
  validate_stack_matches_identity "$STACK_FILE"

  local stack_content
  stack_content="$(render_stack_content "$STACK_FILE" "$IMAGE_DIGEST")"
  local stack_env
  stack_env="$(stack_env_json "$STACK_FILE")"

  log "repo root: $REPO_ROOT"
  log "ambiente: $ENVIRONMENT"
  log "stack: $STACK_NAME"
  log "imagem: $IDENTITY_IMAGE"
  log "image digest: $IMAGE_DIGEST"
  log "arquivo stack: $STACK_FILE"
  log "portainer: $PORTAINER_URL"
  log "endpoint: $PORTAINER_ENDPOINT_ID"

  show_rendered_image_lines "$stack_content"

  local stack_id
  stack_id="$(find_stack_id "$STACK_NAME")"

  if [ -n "$stack_id" ]; then
    log "stack encontrada, iniciando atualização"
    update_stack "$stack_id" "$STACK_NAME" "$stack_content" "$stack_env"
  else
    log "stack não encontrada, iniciando criação"
    local swarm_id
    swarm_id="$(get_swarm_id)"
    log "swarm ID: $swarm_id"
    create_stack "$STACK_NAME" "$stack_content" "$swarm_id" "$stack_env"
  fi

  run_migration_via_portainer
}

main "$@"
