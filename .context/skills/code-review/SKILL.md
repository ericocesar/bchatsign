---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices for the BchatSign monorepo
skillSlug: code-review
phases: [R, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Read the PR description** — confirm the "Why" is clear, the diff matches the description, and the migration plan is spelled out.
2. **Map the change to the layers** — UI → tRPC/Hono → service → Prisma → jobs. Confirm the diff respects the seam.
3. **Run the focused checks** — `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e -- --grep "<flow>"`. For schema changes, `pnpm prisma migrate diff`.
4. **Inspect the diff by category**:
   - **Security** — token handling, secret leakage, recipient PII encryption, HMAC on outbound webhooks.
   - **Auth/authz** — tenancy filters, role checks, recipient token resolution.
   - **Audit log** — every state transition must be logged.
   - **EE gating** — paid features guarded by `LicenseClient`.
   - **i18n** — every new UI string has entries in `packages/lib/translations/<locale>/...`.
   - **Migrations** — forward-only, explicit backfill, no destructive defaults.
   - **Jobs** — registered handler, retry policy, idempotency.
5. **Verify tests** — happy path, at least one failure mode, and a regression test if this fixes a bug.
6. **Comment with priority labels** — `[must]`, `[should]`, `[nit]`, `[praise]`. Resolve `[must]` before merge.
7. **Approve / request changes** — clear, specific, actionable.

## Examples

**Code quality feedback (services):**
```typescript
// Before: inline Prisma in a tRPC procedure
const envelope = await prisma.envelope.findUnique({ where: { id: input.id } });
if (!envelope) throw new Error('not found');
await prisma.envelope.update({ where: { id: input.id }, data: { status: 'COMPLETED' } });

// Suggestion: use the service
const envelope = await getEnvelopeById({ id: input.id, userId: ctx.user.id });
if (!envelope) throw new AppError(AppErrorCode.NOT_FOUND);
await sealEnvelope({ id: envelope.id, userId: ctx.user.id });
```

**Security feedback (recipient token):**
```typescript
// Issue: token in URL params logged in error
return c.json({ error: `Invalid token ${token}` }, 400);

// Fix: log token id (first 4 chars) only, never the full token
logger.warn({ tokenId: token.slice(0, 4) }, 'invalid token');
return c.json({ error: 'INVALID_TOKEN' }, 400);
```

**i18n feedback:**
```tsx
// Issue: hard-coded string
<Button>Send document</Button>

// Fix: translation key
<Button>{t('envelope.send')}</Button>
```

## Quality Bar

- **Focus on the most impactful issues first** — security, data integrity, audit log, tenancy. Style and naming are `[nit]`.
- **Explain why something is a problem** — cite the spec, the audit log requirement, or the OWASP risk.
- **Provide concrete suggestions** — file:line + the exact change. No "consider refactoring this".
- **Consider the developer's experience level** — praise good patterns; teach when a comment would help.
- **Balance thoroughness with pragmatism** — `[should]` findings can be follow-up issues; `[must]` findings block merge.
- **Praise good patterns** — when a PR follows the layered architecture or adds a clean regression test, say so.
- **Verify the test plan** — a passing test suite is necessary but not sufficient; check that the tests assert the right things.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
