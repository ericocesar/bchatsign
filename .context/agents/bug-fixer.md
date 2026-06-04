---
type: agent
name: Bug Fixer
description: Analyze and fix bug reports in the BchatSign monorepo
agentType: bug-fixer
phases: [E, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

Triage bug reports, isolate the failing path, and ship a minimal, well-tested fix. The fix must not regress existing behaviour and must include a regression test that fails on the old code and passes on the new.

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [bug-investigation](./../skills/bug-investigation/SKILL.md) | Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues |

## When to Use

- A user reports incorrect signing, missing emails, or a 500.
- A test fails intermittently or in CI but not locally.
- A webhook delivery or job is stuck / failing.
- An `AppError` with an unfamiliar `AppErrorCode` is surfacing in production logs.
- A recipient reports they cannot open a signing URL.

## Workflow

1. **Reproduce locally** — write or extend a unit/integration test that demonstrates the bug. If it's a UI bug, capture the failing flow in `packages/app-tests/e2e/`.
2. **Locate the layer** — use the call path (loader → tRPC → service → Prisma) to identify the closest failing unit.
3. **Read the audit log** when the bug touches an envelope — `find-document-audit-logs` returns the event history.
4. **Inspect job state** — `JobClient` exposes per-job traces; check whether the sealing job, signing email, or webhook handler was the culprit.
5. **Pin the cause** — distinguish a logical bug (wrong query, wrong status), a data bug (stale fixture, bad migration), and an environment bug (env, provider config).
6. **Design the fix** — smallest possible diff; never refactor unrelated code; add a regression test.
7. **Verify** — run the focused test, then `pnpm test`, then the relevant e2e suite.
8. **Document** — write a one-line entry in the PR description under "Fixes #N" with reproduction, root cause, and the test that proves it.

## Project Conventions

- **Surface area** — bugs often hide in the seam between Remix loader and tRPC procedure, or between service and job dispatch. Trace the call path before guessing.
- **Audit log is the source of truth** — for envelope state, prefer the audit log over the live `Envelope` row; transitions are immutable.
- **Job state is observable** — `LocalJobProvider` exposes `BackgroundTaskFailedError` and `BackgroundTaskExceededRetriesError`; the same shapes are used by Inngest/BullMQ adapters.
- **Token URLs** — recipient signing flows depend on `getDocumentAndRecipientByToken`; an expired or rotated token produces a 404, not a 500.
- **i18n regressions** — verify the failing key in all locales under `packages/lib/translations/`.
- **EE vs OSS** — confirm the failing path isn't gated by `LicenseClient`; missing license may manifest as the feature being absent.
- **Date format** — default rendering is `DD/MM/YYYY HH:mm` in `pt-BR`; date string assertions in tests must pin timezone.
- **Errors** — keep the `AppErrorCode` taxonomy; do not invent new error shapes.
- **Telemetry** — disable locally unless the bug is telemetry-related; `TelemetryClient` is opt-in.

## Output Format

- **Root cause**: one-sentence description with the offending file/line.
- **Reproduction**: failing test path or manual steps.
- **Fix**: diff with rationale.
- **Regression test**: new test path and what it asserts.
- **Side effects**: any new audit log entries, env vars, or provider config required.
- **Sensors**: which CI gate proves the fix sticks.
