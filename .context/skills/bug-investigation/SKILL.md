---
type: skill
name: Bug Investigation
description: Investigate bugs systematically and perform root cause analysis in the BchatSign monorepo
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Reproduce the bug consistently** — write a unit, integration, or Playwright test that fails before the fix. If the bug is a flaky job or webhook, capture the failing run and pin the input.
2. **Gather context** — pull the audit log (`find-document-audit-logs`), the job trace (`JobClient` / `LocalJobProvider`), the request log (Hono / Remix), and the failing Sentry transaction.
3. **Identify when the bug was introduced** — `git bisect` against the failing test; check the recent PRs touching the same entity (`packages/lib/server-only/<entity>/`).
4. **Map the call path** — `apps/remix/app/routes/...` → `apps/remix/server/router.ts` (Hono) or tRPC procedure → `packages/lib/server-only/<entity>/<file>.ts` → Prisma. Stop at the layer that first disagrees with the spec.
5. **Form a hypothesis** — distinguish a logical bug (wrong query, wrong status, wrong Zod schema), a data bug (stale fixture, bad migration), and an environment bug (env var, provider config, license key).
6. **Verify with a focused test** — exercise the failing path with a unit test against the service; for jobs, run `LocalJobProvider` with the captured payload.
7. **Document the root cause** — file:line + the input that triggers it + the audit log row that proves the bad transition.
8. **Plan the fix** — smallest possible diff; regression test; rollback plan if the fix touches a job or migration.

## Examples

**Bug investigation notes (envelope sealing):**
```
## Bug: Envelope seals before last signer completes

### Reproduction
1. Create an envelope with two SIGNER recipients in order.
2. Sign as recipient 1.
3. The sealing job fires immediately, before recipient 2 has signed.

### Investigation
- Audit log: `seal-document.handler.ts` dispatched after the first recipient signed.
- `recipient/complete` mutation in `packages/trpc/server/recipient-router/` triggers `sealEnvelope`.
- `sealEnvelope` is being called per-recipient instead of after all recipients reached a terminal state.
- Bug introduced in commit 9f3a2c1 (recipient refactor).

### Root cause
The new recipient flow dispatches sealing on every completion. The trigger should only fire when the envelope's `completeSigning` predicate returns true (`packages/lib/server-only/envelope/is-envelope-complete.ts`).

### Fix approach
- Update `recipient/complete` to call `isEnvelopeComplete(envelopeId)` first.
- Dispatch `seal-document.handler` only when the predicate is true.
- Add a regression test with two recipients: signing #1 alone does not seal; signing #2 triggers the seal.
- Migrate any in-flight envelopes with a one-off backfill that cancels the duplicate seal.
```

## Quality Bar

- Always reproduce before investigating — never guess.
- Trace the call path across the layered architecture (route → tRPC → service → Prisma) before patching.
- Check recent changes that might relate (`git log -- <entity>/`, the audit log of the affected envelope).
- Use the debugger and structured logs strategically; never log PII or recipient tokens.
- Document findings in the PR description under "Root cause" with the offending file:line and the test that proves it.
- Consider whether the same bug exists elsewhere (sibling entities, parallel `document/*` vs `envelope/*` paths).
- Pin timezone and clock (`vi.useFakeTimers()`); never depend on wall-clock.
- Default locale is `pt-BR` with `DD/MM/YYYY HH:mm`; assert on keys or use `formatDate`.
- Write a regression test with the fix; the test must fail on the old code and pass on the new.
- Coordinate the fix with the team if the failure mode is legal/UX sensitive (sealing, signing, billing).

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
