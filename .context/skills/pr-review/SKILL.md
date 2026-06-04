---
type: skill
name: Pr Review
description: Review pull requests against BchatSign team standards and best practices
skillSlug: pr-review
phases: [R, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Read the PR description** to understand the goal — the "Why" must be clear; the diff matches the description.
2. **Review the linked issue(s)** for context — acceptance criteria, design notes, and prior decisions.
3. **Check that tests are included and passing** — unit, integration, and Playwright for UI flows. CI is green.
4. **Review code changes file by file** — security, auth/authz, audit log, EE gating, i18n, migrations, jobs, a11y.
5. **Verify documentation is updated** — public docs in `apps/docs`, internal docs in `.context/docs/`, runbooks in the relevant package.
6. **Leave constructive feedback with specific suggestions** — `[must]`, `[should]`, `[nit]`, `[praise]`.
7. **Approve, request changes, or comment** based on findings — be explicit.

## Examples

**Approval comment:**
```
LGTM ✅ — clean implementation of the recipient auth flow with comprehensive
unit + e2e coverage. The audit log rows are emitted at the right transitions,
the i18n keys resolve in every locale, and the EE gating is consistent with
`LicenseClient`.

Minor suggestion: extract the auth-predicate in
`packages/lib/server-only/recipient/get-recipient-by-token.ts:42` into a
named function for reuse. Optional — follow-up issue is fine.
```

**Request changes:**
```
Good progress, but a few items need attention before merge:

[must] 1. `apps/remix/app/routes/api+/webhook.trigger.ts:18` — the manual
        webhook trigger logs the full HMAC secret on error. Use the same
        redaction helper as `packages/lib/server-only/webhooks/trigger/`.
[must] 2. `packages/lib/server-only/envelope/duplicate-envelope.ts` — the
        duplicate path does not copy the audit log. Add a regression test
        that proves the duplicate inherits the source's audit history.
[must] 3. `packages/lib/translations/pt-BR/...` — three new UI strings are
        missing. Sensor `i18n-keys-present` should fail.
[should] 4. `apps/remix/app/components/general/document-flow/...` — the
          new modal needs an a11y label. Add `aria-label` and verify with axe.
[should] 5. `packages/prisma/migrations/.../migration.sql` — the migration
          is forward-only but the backfill is in a separate file. Combine
          for atomicity.

Please address the [must] items and I'll re-review.
```

## Quality Bar

- **Start by understanding the PR's goal** — read the description before the diff.
- **Be constructive and specific in feedback** — cite file:line and the exact change.
- **Distinguish between required changes and suggestions** — `[must]`, `[should]`, `[nit]`.
- **Test the changes locally if complex** — pull the branch, run `pnpm dev`, exercise the flow.
- **Check for security implications** — token handling, secret leakage, recipient PII, HMAC.
- **Verify backward compatibility** — REST v1, tRPC procedure names, recipient URL shapes.
- **Approve only when confident in the changes** — `[must]` findings block merge.
- **Praise good patterns** — clean refactor, well-targeted regression test, thoughtful i18n coverage.
- **Coordinate the rollout** — feature flag, env change, license change, rotation.
- **Sensor coverage** — list which `.context/harness/sensors.json` sensors apply to this change.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
