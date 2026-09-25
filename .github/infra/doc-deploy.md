# Deploy bchatsign via Portainer (digest imutável)

Fluxo canônico:

```bash
# 1. Build local linux/amd64 + push GHCR (gera docs/historico/latest-digest)
npm run push

# 2. Deploy por ambiente (digest lido de docs/historico/latest-digest)
npm run deploy:dev
npm run deploy:prod
```

Equivalente explícito:

```bash
./scripts/build-and-push-ghcr.sh
IMAGE_DIGEST=$(cat docs/historico/latest-digest) ./scripts/deployportainer.sh dev
IMAGE_DIGEST=$(cat docs/historico/latest-digest) ./scripts/deployportainer.sh prod
```

Regras:

- Deploy usa `IMAGE_DIGEST` (`sha256:<64 hex>`), nunca tag mutável (`sha-xxxx`, `branch`).
- Identidade (stack, imagem, URL/endpoint Portainer) vem de `.github/infra/identity.json`.
- Stacks devem declarar `image: ghcr.io/ericocesar/bchatsign@${IMAGE_DIGEST}`.
- `PORTAINER_API_KEY` vem de `.env.deploy.<dev|prod>` (gitignored) ou
  `.github/infra/.env.deploy.<dev|prod>`. Legado `.github/infra/portainer.<env>.env`
  ainda é aceito com aviso — migrar e rotacionar a key versionada.

Arquivos:

- Build: `scripts/build-and-push-ghcr.sh` (`DOCKERFILE` default `docker/Dockerfile`, `PLATFORM` default `linux/amd64`)
- Deploy: `scripts/deployportainer.sh`
- Identidade: `.github/infra/identity.json`
- Stacks: `.github/infra/stack-dev.yml`, `.github/infra/stack-prod.yml`
- Digest: `docs/historico/latest-digest` (+ `latest-tag`, `latest-image`, `build-info.json`)
