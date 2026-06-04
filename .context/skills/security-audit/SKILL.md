---
type: skill
name: Security Audit
description: Review code and infrastructure for security weaknesses in the BchatSign monorepo
skillSlug: security-audit
phases: [R, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Review authentication implementation** — sessions in `packages/auth`, passkeys in `packages/auth/server` and `packages/lib/server-only/auth/update-passkey.ts`, 2FA in `packages/lib/server-only/2fa`, OAuth/OIDC.
2. **Check authorization on all endpoints** — `ctx.user`, `ctx.organisation.id`, role checks in tRPC procedures and Remix loaders. Recipient URLs resolve identity from the token, not from client input.
3. **Look for injection vulnerabilities** — Prisma parameterised queries, Zod validation, `dangerouslySetInnerHTML` for user content (forbidden), template literal interpolation of user input.
4. **Verify input validation and sanitization** — every input is Zod-validated, ideally from `packages/prisma/generated/zod`. File uploads go through the storage provider's typed API.
5. **Check for sensitive data exposure** — recipient PII, signing material, HMAC secrets, API tokens, license keys. Confirm encryption at rest, encryption in transit (TLS), and redaction in logs.
6. **Review dependency security** — `pnpm audit`, Renovate PRs, licence check, supply chain provenance.
7. **Document findings with severity** — `[critical]`, `[high]`, `[medium]`, `[low]`, `[info]`.

## Examples

**Security audit report (BchatSign PR):**
```
## Security Audit Report — feat/recipient-auth-options

### Critical
(none)

### High
1. `packages/lib/server-only/recipient/get-recipient-by-token.ts:42`
   - The auth gate is applied after the recipient payload is loaded; an attacker
     can probe the recipient by timing.
   - Fix: load only the auth requirements first, fail fast, then load the
     payload.
2. `apps/remix/app/routes/api+/webhook.trigger.ts:18`
   - The manual trigger logs the HMAC secret on error.
   - Fix: redact with the same helper used in
     `packages/lib/server-only/webhooks/trigger/`.

### Medium
3. `packages/lib/server-only/envelope/duplicate-envelope.ts`
   - The duplicate path does not include `UserSecurityAuditLogType.DUPLICATE`.
   - Fix: write a `DUPLICATE` audit row before returning.

### Low
4. `apps/remix/app/components/dialogs/...`
   - The new dialog lacks `aria-describedby` on the confirm button.
   - Fix: add the description id.

### Recommendations
- Add a sensor in `.context/harness/sensors.json` that runs `pnpm audit` on
  every PR and blocks on high-severity findings.
- Add a rate-limit guard around the manual webhook trigger to prevent
  abuse.
```

## Quality Bar

- **Check OWASP top 10 vulnerabilities** — injection, broken auth, sensitive data exposure, XXE, broken access control, security misconfiguration, XSS, insecure deserialization, vulnerable components, insufficient logging.
- **Never trust user input** — even with cookies, even with API tokens; re-validate at the service boundary.
- **Review authentication carefully** — session lifetime, passkey challenge, 2FA flow, OAuth/OIDC handshake.
- **Verify authorization on all routes** — every loader and procedure enforces tenancy.
- **Check for sensitive data exposure** — logs, error responses, telemetry payloads.
- **Scan dependencies for known vulnerabilities** — `pnpm audit`, Renovate, supply chain checks.
- **Document findings with clear severity levels** — `[critical]`, `[high]`, `[medium]`, `[low]`, `[info]`.
- **Coordinate with the team** — `[critical]` and `[high]` block merge; `[medium]` and `[low]` are tracked.
- **Verify the test plan** — security-critical changes need a regression test that fails on the old code.
- **Coordinate the rollout** — feature flag, env change, license change, secret rotation.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
