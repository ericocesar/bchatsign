#!/bin/sh

# 🚀 Starting Bchatsign...
printf "🚀 Starting Bchatsign...\n\n"

# 🔐 Check certificate configuration
printf "🔐 Checking certificate configuration...\n"

CERT_PATH="${NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH:-/opt/bchatsign/cert.p12}"

if [ -f "$CERT_PATH" ] && [ -r "$CERT_PATH" ]; then
    printf "✅ Certificate file found and readable - document signing is ready!\n"
else
    printf "⚠️ Certificate not found or not readable\n"
    printf "💡 Tip: Bchatsign will still start, but document signing will be unavailable\n"
    printf "🔧 Check: http://localhost:3000/api/certificate-status for detailed status\n"
fi

printf "\n📚 Useful Links:\n"
printf "📖 Documentation: https://docs.bchatsign.com\n"
printf "🐳 Self-hosting guide: https://docs.bchatsign.com/developers/self-hosting\n"
printf "🔐 Certificate setup: https://docs.bchatsign.com/developers/self-hosting/signing-certificate\n"
printf "🏥 Health check: http://localhost:3000/api/health\n"
printf "📊 Certificate status: http://localhost:3000/api/certificate-status\n"
printf "👥 Community: https://github.com/bchatsign/bchatsign\n\n"

printf "🗄️  Running database migrations...\n"
npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma

printf "🌟 Starting Bchatsign server...\n"
# Force production so runtime code paths (i18n catalog loading, logging, etc.)
# behave correctly. Without this, getTranslations() can fall back to the raw
# `.po` catalog and emit "Uncompiled message detected" warnings.
NODE_ENV="${NODE_ENV:-production}" HOSTNAME=0.0.0.0 node build/server/main.js
