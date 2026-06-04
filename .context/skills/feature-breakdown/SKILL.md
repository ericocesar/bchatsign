---
type: skill
name: Feature Breakdown
description: Break down features into implementable tasks across the BchatSign monorepo
skillSlug: feature-breakdown
phases: [P]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Understand the full feature requirements** — read the issue, the spec, and the design. Confirm the user-visible behaviour and the acceptance criteria.
2. **Map to the layered architecture** — list every layer the feature crosses (UI, tRPC, service, schema, jobs, i18n, docs, tests).
3. **Identify the entities** — find the right entity folders in `packages/lib/server-only/<entity>/` and the tRPC router folders in `packages/trpc/server/<entity>-router/`. Reuse before creating.
4. **Break into independent, testable tasks** — each task is one logical change that ships behind a flag or lands as a single commit.
5. **Identify dependencies** between tasks — schema before service, service before tRPC, tRPC before UI, UI before i18n.
6. **Order tasks by dependency and priority** — schema and service come first; UI and i18n last.
7. **Add acceptance criteria** to each task — what proves the task is done.
8. **Flag unknowns or risks** — EE gating, i18n, a11y, perf, security.

## Examples

**Feature breakdown (per-recipient auth options):**
```
## Feature: Per-recipient auth options

### Task 1: Schema
- Add `recipientAuthOptions` JSON column to `Recipient` (Prisma migration).
- Update generated Zod schema in `packages/prisma/generated/zod/modelSchema/RecipientSchema.ts`.
- Acceptance: `pnpm db:push` and `pnpm prisma generate` succeed.

### Task 2: Service
- Extend `packages/lib/server-only/recipient/create-envelope-recipients.ts` and `update-envelope-recipients.ts` to accept and persist the auth options.
- Acceptance: Unit tests in `__tests__/create-envelope-recipients.test.ts` cover the happy path and one failure mode.

### Task 3: tRPC
- Add `authOptions` field to the input schema of `recipientRouter.create` and `update`.
- Acceptance: API contract test in `packages/app-tests/e2e/api/trpc/recipient.test.ts` passes.

### Task 4: Recipient signing flow
- Update `packages/lib/server-only/recipient/get-recipient-by-token.ts` to apply the auth gate before returning the recipient.
- Acceptance: Integration test in `__tests__/sign-with-recipient-auth.test.ts` proves the auth gate is enforced.

### Task 5: UI — add signers step
- Add the auth options dropdown to `packages/ui/primitives/document-flow/add-signers.tsx`.
- Acceptance: Playwright in `packages/app-tests/e2e/document-flow/add-signers-auth.e2e.ts` proves the option is persisted.

### Task 6: i18n
- Add translation keys to all locales under `packages/lib/translations/`.
- Acceptance: Sensor `i18n-keys-present` passes.

### Task 7: Docs
- Update the public docs in `apps/docs` and the internal docs in `.context/docs/glossary.md`.
- Acceptance: `pnpm docs:build` passes; the new keys resolve in the search index.

### Dependencies
- Task 2 depends on Task 1.
- Task 3 depends on Task 2.
- Task 4 depends on Task 1 and Task 3.
- Task 5 depends on Task 2.
- Task 6 depends on Task 5.
- Task 7 depends on Task 5.

### Risks
- EE gating: confirm `LicenseClient` exposes the feature for paid plans.
- Backwards compatibility: existing envelopes without `recipientAuthOptions` default to the legacy behaviour.
```

## Quality Bar

- Each task is independently testable — the test plan is part of the task.
- Tasks are small enough to complete in a day — bigger is a feature, not a task.
- Acceptance criteria are explicit — the diff + a passing test is the contract.
- Dependencies are spelled out — a task graph, not a wish list.
- Flag technical risks or unknowns early — EE gating, i18n coverage, perf budget, security review.
- Consider parallel work — schema + i18n + docs can land in parallel with the service.
- Map every task to the layered architecture — UI never touches Prisma; tRPC never holds business logic.
- Reuse the entity folders — new entities are rare; new fields are common.
- Pin the i18n coverage — every UI string needs entries in every locale.
- Plan the rollout — feature flag, release note, and the user-visible behaviour.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
