---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Development Workflow

Day-to-day work in BchatSign follows a **trunk-based** model with short-lived feature branches and required PR reviews. The repository is a pnpm monorepo; every package and app shares TypeScript and ESLint/Prettier configuration from `packages/tsconfig` and root `eslint`/`prettier` configs. Most local work targets the `develop` branch — the current working branch is `develop` per the bootstrap status — and releases are cut from `main`.

## Branching & Releases

- **`main`** — production releases. Tags drive the changelog and Docker images.
- **`develop`** — integration branch. Day-to-day work lands here via PRs.
- **Feature branches** — `feat/<short-slug>`, `fix/<short-slug>`, `chore/<short-slug>`, scoped when possible (`feat/sign-pdf-rotation`, `fix/team-invite-bounce`).
- **Release flow** — `develop` is fast-forwarded into `main`; tag `vX.Y.Z`; CI builds images, runs migrations, and publishes changelog notes.
- **Hotfixes** — branch from `main` (`hotfix/<slug>`), merge back to both `main` and `develop`.
- **Commit messages** — Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`); enforced by lint-staged and the `commit-message` skill.

## Local Development

- Install Node.js 20+ and pnpm 9+.
- Install dependencies:
  ```bash
  pnpm install
  ```
- Provision environment files: copy `.env.example` from the root, `apps/remix`, `apps/docs`, and `apps/openpage-api` and fill in DB, Redis, SMTP, and (optionally) Stripe / S3 / Inngest credentials.
- Start the database and auxiliary services:
  ```bash
  docker compose up -d postgres redis minio mailhog
  ```
- Push the Prisma schema and seed fixtures:
  ```bash
  pnpm db:push
  pnpm db:seed
  ```
- Run all apps in parallel (Remix + docs + openpage-api):
  ```bash
  pnpm dev
  ```
- Build a production bundle:
  ```bash
  pnpm build
  ```
- Run unit tests, lint, and type checks:
  ```bash
  pnpm test
  pnpm lint
  pnpm typecheck
  ```
- Run end-to-end tests:
  ```bash
  pnpm test:e2e
  ```
- Re-generate Prisma client after schema changes:
  ```bash
  pnpm prisma generate
  ```

## Code Review Expectations

- Every PR requires at least **one approving review** from a code owner. Sensitive surfaces (auth, signing, webhooks, billing) require two.
- Reviewers should verify:
  - **Scope** — the diff matches the PR description; no drive-by refactors.
  - **Tests** — new logic has unit tests; UI or flow changes have Playwright coverage under `packages/app-tests`.
  - **i18n** — new UI strings have entries in `packages/lib/translations/<locale>/...` (en, pt-BR, es, fr, de, it, ja, ko, nl, pl, zh at minimum).
  - **Security** — auth/authz, tokens, secrets, and audit log are respected. No raw `dangerouslySetInnerHTML` for user content. No new dependencies with high CVE counts.
  - **Migrations** — Prisma migrations are reviewed alongside code; backfill/forward-only changes are spelled out in the PR body.
  - **EE boundaries** — paid-only behaviour is gated through `LicenseClient`; no enterprise code leaks into OSS builds.
- Use `.context/agents/code-reviewer.md` as a checklist for deeper reviews. Use the `code-review` skill for a guided walk-through.

## Pull Request Template

The PR body should include:

- **Why** — one-paragraph problem statement.
- **What** — bulleted change summary.
- **Test plan** — manual or automated reproduction steps.
- **Screenshots / recordings** — required for UI changes.
- **Migration / rollback** — explicit if a Prisma migration is included.

## Onboarding Tasks

- New starters should:
  1. Complete the **Getting Started Checklist** in [project-overview.md](project-overview.md).
  2. Read [architecture.md](architecture.md) and [data-flow.md](data-flow.md).
  3. Pick a starter ticket labelled `good first issue` — usually small UI tweaks, copy updates, or single-service refactors.
  4. Pair with a maintainer for the first PR.
- Internal runbook lives under `docs/` and is mirrored on the team wiki; the search endpoint is exposed at `apps/docs/src/app/api/search`.

## Definition of Done

- ✅ Tests pass locally and in CI.
- ✅ Lint, typecheck, and format checks pass.
- ✅ Translations updated (UI changes).
- ✅ Documentation updated (`docs/`, `.context/docs/`, or README).
- ✅ Migration plan described in the PR if Prisma is touched.
- ✅ Audit log fields added when state transitions change.

## Related Resources

- [testing-strategy.md](testing-strategy.md)
- [tooling.md](tooling.md)
- [security.md](security.md)
