---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Security & Compliance Notes

BchatSign handles legally significant documents, so identity, signature integrity, and audit trails are first-class. This document captures the policies and guardrails that keep the platform secure and compliant. The product targets a Brazilian customer base (default locale `pt-BR`) and operates under LGPD-aligned practices; the same patterns also satisfy general SOC2 / ISO 27001 expectations.

## Authentication & Authorization

- **Session strategy** — `packages/auth` owns server sessions and passkeys. Cookies are signed (HMAC) and, when configured, `__Host-` prefixed. Session payload is encrypted at rest; `ActiveSession` (`packages/auth/server/lib/utils/get-session.ts:39`) is the canonical shape.
- **Identity providers** — `IdentityProvider` enum: `EMAIL | GOOGLE | MICROSOFT | OIDC | PASSKEY`. Account linking is allowed but is gated to the user's primary email to prevent silent takeovers.
- **Passkeys (WebAuthn)** — `packages/lib/server-only/auth/update-passkey.ts` and `packages/auth/server` cover registration, assertion, and revocation. Stored credentials are encrypted at rest; backups are user-managed.
- **2FA** — TOTP and email-based one-time codes (`packages/lib/server-only/2fa`). 2FA can be required per envelope via `DocumentAuthOptions.ACCESS_AUTH = ACCESS_AUTH_2FA` and per recipient via `RecipientAuthOptions`.
- **Roles** — `Role` enum: `ADMIN | MEMBER` (plus enterprise-only roles). Authorisation is enforced in tRPC procedures and in Remix loaders; admin tools live under `/_authenticated/admin+/*`.
- **Recipient auth** — token URLs (`/sign.<token>`, `/d.<token>`) carry a signed token that resolves a recipient. Tokens are unique per envelope, stored hashed, and may be revoked. Additional gates (account, email link, passkey) are applied via `RecipientAuthOptions`.
- **API auth** — `packages/api/v1` requires an `ApiToken` (hashed at rest, indexed by prefix). `ApiTokenAlgorithm` controls the hashing algorithm (`SHA256` or `SHA512`).
- **Rate limiting** — `packages/lib/server-only/rate-limit` guards auth, password reset, signing, and webhook delivery endpoints. Backed by the configured provider (in-memory in dev, Redis in production).
- **Captcha** — `packages/lib/server-only/captcha` provides a pluggable captcha adapter; required on public sign-up and password reset when configured.

## Secrets & Sensitive Data

- **Storage** — secrets live in environment variables (`.env` for local, secret manager in production). Never commit `.env` files; only `.env.example` is tracked.
- **Encryption at rest** — uploaded PDFs and signed outputs are stored encrypted in the configured upload provider (S3 SSE-S3/SSE-KMS or Azure Blob CMEK). Database backups must inherit the same encryption posture.
- **Signing material** — production deployments use either P12 keystores (mounted via secret manager) or Google Cloud KMS (`SIGNING_TRANSPORT=google-cloud`). Local development uses the local P12 transport.
- **Webhook signing** — outbound webhooks are signed with HMAC-SHA256 using a per-team secret; consumers must verify the signature header before acting.
- **Recipient PII** — name, email, and phone are stored encrypted at the application level for the lifetime required for the audit trail, then archived per data-retention policy.
- **Audit log retention** — the audit log is retained for the legally required period; deletion is via the admin tools and is itself audited.
- **Telemetry** — `TelemetryClient` is opt-in and disabled by default in self-hosted OSS builds. The EE build can be configured to report aggregate usage metrics.
- **Data classifications** —
  - **Public**: marketing pages, documentation, public metrics.
  - **Internal**: audit logs, job traces, error reports.
  - **Confidential**: recipient PII, signed PDFs, signing keys, API tokens.
  - **Restricted**: licence keys, payment data (handled by Stripe, not stored locally).

## Compliance & Policies

- **LGPD (Brazil)** — explicit consent on first-run for marketing cookies; data subject access and deletion requests are handled through the admin tools; DPIA artefacts live in the team wiki.
- **GDPR (EU)** — data export endpoint, deletion endpoint, and processor agreement surfaced in the docs site.
- **eIDAS / RFC 3161** — when configured, signed PDFs include an RFC 3161 timestamp from a trusted TSA (`getTimestampAuthority`).
- **SOC2 controls** — change management (PR review), logging (`UserSecurityAuditLogType`), access control (roles), encryption in transit (TLS) and at rest.
- **Internal policies**:
  - No production data in dev/test environments — use `prisma db seed` and synthetic fixtures.
  - No raw `dangerouslySetInnerHTML` for user content.
  - No new third-party dependencies without a security review and licence check.
  - Migrations are forward-only; destructive changes require an explicit deprecation window.
  - Audit log entries are immutable; corrections are new entries.

## Incident Response

- **On-call** — maintained in the team rota; alert sources include Sentry, audit-log anomalies, and Stripe webhook failures.
- **Escalation** — security@ address monitored; severity matrix aligns with the team SLA.
- **Detection** — anomaly detection runs on signing frequency, recipient access patterns, and webhook failure rates; spikes trigger `UserSecurityAuditLogType` entries.
- **Triage** — `AdminDashboardUsersTable` and `AdminDocumentLogsTable` are the primary consoles; for a compromised account, lock the user, revoke all sessions, force a password reset, and rotate API tokens.
- **Post-incident** — write a timeline (UTC), note the data classes affected, notify customers per the contractual window, and update this document with new controls.

## Operational Hygiene

- **Dependencies** — `pnpm audit` in CI; Renovate for automated PRs; critical CVEs block release.
- **Static analysis** — TypeScript strict mode; ESLint security rules; secrets scanning on commit hooks.
- **Backups** — Postgres PITR enabled; storage provider versioning enabled; restore drills quarterly.
- **Logging** — structured logs include request id, user id (when authenticated), and envelope id; PII is redacted.
- **CSP / Headers** — Hono response helpers set `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. The Remix document mirrors these for client routes.

## Related Resources

- [architecture.md](architecture.md) for module boundaries that enforce auth/authz.
- [data-flow.md](data-flow.md) for where tokens and audit events flow.
- [development-workflow.md](development-workflow.md) for code-review expectations around secrets and migrations.
