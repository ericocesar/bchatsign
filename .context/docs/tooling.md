---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Tooling & Productivity Guide

BchatSign is a pnpm monorepo. Most day-to-day work uses pnpm scripts and a small set of opinionated tools. This guide captures the install-once setup and the shortcuts that make contributing faster.

## Required Tooling

- **Node.js 20+** — required by Remix, Vite, and modern dependencies. Use `nvm` or `fnm` to pin per-project.
- **pnpm 9+** — package manager for the monorepo. Enable workspaces with `pnpm-workspace.yaml`.
- **Docker / Docker Compose** — for Postgres, Redis, MinIO, and MailHog. Optional: use managed services.
- **Postgres client (`psql`)** — handy for inspecting seed data.
- **Stripe CLI** (optional) — for local webhook forwarding during subscription work.
- **Inngest CLI** (optional) — for local job runner during dev.
- **mkcert** (optional) — for HTTPS in the embed iframe sandbox.
- **Prisma CLI** — installed per package; alias `pnpm prisma ...` from any package.

## Recommended Automation

- **Pre-commit hooks** — Husky + lint-staged run Prettier and ESLint on staged files. Commits that fail formatting are auto-fixed and re-staged.
- **Lint and format**:
  ```bash
  pnpm lint
  pnpm lint:fix
  pnpm format
  ```
- **Type checks**:
  ```bash
  pnpm typecheck
  ```
- **Prisma helpers**:
  ```bash
  pnpm db:push        # apply schema
  pnpm db:seed        # load fixtures
  pnpm db:reset       # nuke + re-apply + re-seed
  pnpm db:studio      # Prisma Studio
  pnpm prisma generate
  ```
- **Repository scripts** — under `scripts/`:
  - `pnpm tsx scripts/create-scratch.ts` — generate a scratch user for manual testing.
  - `pnpm tsx scripts/create-plan.ts` — generate a plan for a subscription in dev.
  - `pnpm tsx scripts/create-justification.ts` — create a justification record.
- **Watch modes**:
  - `pnpm dev` — Remix + docs + openpage-api together.
  - `pnpm --filter @documenso/ui dev` — Storybook-style playground for components.
  - `pnpm test -- --watch` — Vitest watch.
- **Quick smoke**:
  - `pnpm typecheck && pnpm lint && pnpm test` — the local pre-PR loop.
- **E2E selectors**:
  - `pnpm test:e2e -- --grep "@smoke"` — run only the smoke suite.
- **PR helpers**:
  - `pnpm commit` — interactive Conventional Commits prompt.

## IDE / Editor Setup

### VS Code (recommended)

Recommended extensions:

- **ESLint** (`dbaeumer.vscode-eslint`).
- **Prettier** (`esbenp.prettier-vscode`).
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — set `tailwindCSS.experimental.classRegex` to include the `cn` helper output.
- **Prisma** (`prisma.prisma`).
- **MDX** (`silofy.mdx-side-editor` or `unifiedjs.vscode-mdx`).
- **Vitest** (`vitest.explorer`).
- **Playwright** (`ms-playwright.playwright`).
- **GitLens** (`eamodio.gitlens`).
- **Error Lens** (`usernamehw.errorlens`).
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`).
- **i18n Ally** (`lokalise.i18n-ally`) — point it at `packages/lib/translations` for inline locale previews.
- **Todo Tree** (`gruntfuggly.todo-tree`).

Useful workspace settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": ["cn\\(([^)]*)\\)"]
}
```

### JetBrains (WebStorm / IntelliJ)

- Enable the **Prettier** and **ESLint** plugins.
- Enable **Tailwind CSS** support (built-in since 2023.2).
- Add `packages/lib/translations/*.json` to the **i18n plugin** for inline inspection.
- Add `*.prisma` to recognised file types.

## Productivity Tips

- **Local HTTPS for embeds** — the embed flows need a secure context for `window.postMessage`; use `mkcert` to issue a local cert and run `pnpm dev --https`.
- **MailHog dashboard** — `http://localhost:8025` shows every email sent in dev, including signing links.
- **MinIO console** — `http://localhost:9001` for inspecting uploaded PDFs.
- **Stripe webhook forwarding** — `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`.
- **Inngest dev server** — `npx inngest-cli@latest dev` runs alongside `pnpm dev`; the dashboard lives at `http://localhost:8288`.
- **Prisma Studio** — `pnpm db:studio` for quick data inspection.
- **Quick seed for a team** — `pnpm tsx scripts/create-scratch.ts --team <teamUrl>` provisions a sender with templates.
- **Hot reload gotcha** — changes to `packages/prisma/schema.prisma` require a Prisma generate and a Remix server restart.
- **Debug a tRPC procedure** — use the `loggerLink` in the tRPC client; verbose mode dumps the procedure path and inputs.
- **Debug a Remix loader** — `console.log` lands in the terminal running `pnpm dev`; use the `load-context` types to inspect the request.
- **Profile a slow page** — enable the React Profiler in the dev build; check `apps/remix/app/components/tables/*` for virtual-list tuning (`virtual-list`).
- **Test a webhook locally** — `curl -H "X-Signature: ..." -d @payload.json http://localhost:3000/api/webhook/trigger`.
- **JSON pretty-print in the terminal** — `pnpm dlx jq '.result.data' < response.json`.
- **Time travel in tests** — use `vi.useFakeTimers()` and `vi.setSystemTime()` to deterministically exercise expiry windows.

## Related Resources

- [development-workflow.md](development-workflow.md) for branching and PR expectations.
- [testing-strategy.md](testing-strategy.md) for running and authoring tests.
- [project-overview.md](project-overview.md) for the technology stack and getting started.
