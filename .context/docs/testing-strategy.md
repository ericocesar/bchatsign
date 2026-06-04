---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Testing Strategy

BchatSign aims for fast feedback at the unit and integration layer, and high-confidence coverage of the most legally significant flows at the e2e layer. Tests live alongside the code they exercise; e2e flows are organised by feature area in `packages/app-tests`.

## Test Types

- **Unit (Vitest)** — used for `packages/lib`, `packages/ui`, `packages/trpc`, and the helpers in `packages/signing`. Files end in `*.test.ts` / `*.test.tsx` and run in isolation. Mocks are scoped to the test file; never global.
  - Naming: `create-envelope.test.ts`, `field-renderer.test.ts`.
  - Coverage targets: every service in `packages/lib/server-only/*` has tests for the happy path and at least one failure mode.
- **Integration (Vitest + Prisma)** — domain services that touch the database run against a per-test Postgres (Docker) or sqlite-shadow. Schemas are reset between tests using the seed helpers in `packages/prisma/seed/*`.
  - Helpers: `seedTestEmail`, `seedUser`, `seedTemplate`, `seedTeam` from `packages/prisma/seed`.
- **End-to-end (Playwright)** — under `packages/app-tests/e2e`. Per-flow fixtures (e.g. `envelope-editor.ts`, `document-flow.ts`, `teams.ts`) compose steps. Each flow is a self-contained test suite.
  - Authenticated runs use pre-seeded users; unauthenticated runs use the public sign URLs.
  - PDF comparisons are byte-equal where possible; visual diffs for new templates.
- **API tests** — REST v1 and tRPC tests under `packages/app-tests/e2e/api/v1`, `v2`, and `trpc/admin`. These exercise the public contract and are run in CI before release.
- **Snapshot tests** — minimal use; reserved for React-PDF output and email templates where regressions are otherwise silent.

## Running Tests

- All unit tests (workspace-wide):
  ```bash
  pnpm test
  ```
- Single package:
  ```bash
  pnpm --filter @documenso/lib test
  ```
- Watch mode for fast iteration:
  ```bash
  pnpm test --watch
  ```
- Coverage report:
  ```bash
  pnpm test --coverage
  ```
- End-to-end (requires Postgres + Redis + MinIO running):
  ```bash
  pnpm test:e2e
  ```
  - Headed mode: `pnpm test:e2e -- --headed`.
  - Specific flow: `pnpm test:e2e -- packages/app-tests/e2e/document-flow`.
- API-only contract tests:
  ```bash
  pnpm test:api
  ```
- Type checks and lint (run as part of CI):
  ```bash
  pnpm typecheck
  pnpm lint
  ```

## Quality Gates

- **Unit coverage** — minimum 70% lines / 65% branches for `packages/lib`; relaxed to 60% / 55% for UI components. Critical services (signing, sealing, auth, billing) aim for 90%+.
- **Lint** — `pnpm lint` must pass; ESLint security rules enabled (`no-eval`, `no-implied-eval`, no `dangerouslySetInnerHTML` for user content).
- **Type check** — `pnpm typecheck` must pass with strict mode.
- **Format** — Prettier must pass (`pnpm format`).
- **Migrations** — `prisma migrate diff` between branch and `main` must be empty unless the PR adds a migration; backfills are scripted and tested.
- **Required e2e coverage for new features** — at least one happy-path Playwright test per new flow in `packages/app-tests/e2e`. A11y checks (axe) run on key signing pages.
- **PR review** — at least one approving review; sensitive surfaces (auth, signing, webhooks, billing) require two.
- **Release gating** — release pipeline blocks on a green e2e run against the staging cluster; a manual sign-off is required for EE-only changes.

## Test Authoring Guidelines

- **Determinism** — never depend on wall-clock time; use the injected clock (`packages/lib/utils/clock.ts`).
- **Test names** — describe the behaviour, not the implementation (`it('rejects when access auth is not satisfied')`).
- **Fixtures** — compose from `seedX` helpers; do not duplicate data construction.
- **Mocks** — for external providers (S3, Stripe, KMS), inject a fake via the corresponding `Base*Provider` interface; do not monkey-patch module exports.
- **Coverage gaps** — if a path is intentionally untested, leave a `// istanbul ignore next` with a one-line justification.
- **i18n tests** — assert that translation keys resolve in every locale under `packages/lib/translations`.

## Troubleshooting

- **Flaky e2e** — usually a race in the sealing job. Increase the wait helper (`packages/app-tests/utils/wait-for.ts`) or seed deterministic fixtures.
- **Long-running tests** — `seal-document.handler.ts` and HTML→PDF are the slowest. Run them in dedicated `playwright.config.ts` workers (`calculateWorkers` in `packages/app-tests/playwright.config.ts`).
- **Database drift** — when local migrations diverge from CI, run `pnpm db:reset` and re-seed; never hand-edit the schema.
- **MinIO / S3 differences** — when migrating to real S3, double-check CORS configuration and `Content-Disposition` headers (the embed flows depend on inline rendering).
- **Timezone bugs** — date rendering uses the user locale; tests that assert on date strings must pin a timezone in `process.env.TZ` and use the `formatDate` helper from `packages/lib`.

## Related Resources

- [development-workflow.md](development-workflow.md) for CI gates and PR expectations.
- [tooling.md](tooling.md) for editor and debugging setup.
