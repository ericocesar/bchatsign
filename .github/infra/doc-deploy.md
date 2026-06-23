# Deploy
./scripts/deployportainer.sh {IMAGE_TAG} {AMBIENTE}
./scripts/deployportainer.sh {IMAGE_TAG} {AMBIENTE} {STACK_NAME}

# Exempos
./scripts/deployportainer.sh sha-1bdc343 prod
./scripts/deployportainer.sh sha-1bdc343 dev
./scripts/deployportainer.sh sha-1bdc343 prod consigcrm

pnpm deploy sha-abc123 dev
pnpm deploy sha-abc123 prod
pnpm deploy sha-abc123 prod consigcrm