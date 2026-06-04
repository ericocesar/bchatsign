---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Project Overview

BchatSign is a document-signing platform (a fork of Documenso) that lets organisations prepare, send, sign, and audit PDF envelopes with cryptographic signatures, recipient authentication, and team collaboration. The product targets Brazilian and global teams — locale defaults are `pt-BR` and dates render as `DD/MM/YYYY HH:mm` — while still supporting ten other languages via the `packages/lib/translations` set.

## Codebase Reference

> **Semantic Snapshot**: Use `context({ action: "getMap", section: "all" })` for generated stack, architecture layers, key files, and dependency hotspots.

## Quick Facts

- **Root**: `/Users/ericocesar/Mac.local/boltdev/2026/testar/documenso`
- **Type**: pnpm / monorepo (`packages/*`, `apps/*`)
- **Primary Language**: TypeScript (strict mode via `packages/tsconfig`)
- **Web App**: Remix (`apps/remix`) — UI, server routes, tRPC, REST API
- **Public Site / API**: Hono (`apps/openpage-api`) — marketing site + read-only public metrics
- **Docs Site**: `apps/docs` — MDX documentation, search, OG image generation
- **Default Locale**: `pt-BR`; date format `DD/MM/YYYY HH:mm`
- **Entry — Web**: `apps/remix/server/router.ts` (Hono on Remix) and `apps/remix/app/root.tsx`
- **Entry — tRPC**: `packages/trpc/server/router.ts`
- **Entry — REST**: `packages/api/v1`
- **Entry — Signing CLI**: `packages/signing/index.ts` → `signPdf`

## Entry Points

- [apps/remix/server/router.ts](apps/remix/server/router.ts) — Hono router mounted inside the Remix server.
- [apps/remix/app/root.tsx](apps/remix/app/root.tsx) — Remix root document.
- [apps/remix/server/load-context.ts](apps/remix/server/load-context.ts) — request context wiring (auth, prisma, jobs).
- [packages/trpc/server/router.ts](packages/trpc/server/router.ts) — `AppRouter` aggregator for tRPC.
- [packages/api/v1](packages/api/v1) — public REST API surface (Hono).
- [packages/signing/index.ts](packages/signing/index.ts) — programmatic PDF signing entrypoint.
- [apps/openpage-api/app](apps/openpage-api/app) — Hono routes for marketing site metrics.

## Key Exports

- **`AppRouter`** (`packages/trpc/server/router.ts:36`) — tRPC root router combining all routers.
- **`AuthClient`** (`packages/auth/client/index.ts:36`) — client-side auth helper.
- **`signPdf`** (`packages/signing/index.ts:38`) — sign a PDF buffer with a chosen transport.
- **`createLocalSigner` / `createGoogleCloudSigner`** — pluggable signing transports.
- **`S3Provider` / `AzureBlobProvider`** — storage providers (`packages/lib/universal/upload/providers`).
- **`InngestJobProvider` / `BullMQJobProvider` / `LocalJobProvider`** — job queue backends.
- **`JobClient`** — unified job submission API used by domain services.
- **`TelemetryClient`** / **`LicenseClient`** — opt-in instrumentation and license checks (EE).

## File Structure & Code Organization

- **`apps/remix`** — main web app: routes, components, server-side tRPC context, AI endpoints, file APIs.
- **`apps/docs`** — MDX-driven documentation site with `llms.txt` and search.
- **`apps/openpage-api`** — Hono app for public marketing/site metrics (GitHub stars, signers, MRR).
- **`packages/lib`** — domain logic split into `server-only/*`, `client-only/*`, `universal/*`, and `jobs/*`.
- **`packages/ui`** — design-system primitives (`@documenso/ui*`) and document-flow / template-flow wizards.
- **`packages/trpc`** — tRPC routers, context, form-data helpers.
- **`packages/prisma`** — schema, generated client, Zod models, seed scripts.
- **`packages/api`** — public REST API (v1, with v2 examples).
- **`packages/email`** — React-Email templates and transports (SMTP, MailChannels).
- **`packages/signing`** — PDF signing with P12 / Google Cloud KMS, plus TSA helpers.
- **`packages/auth`** — server session, passkey, and 2FA primitives.
- **`packages/ee`** — enterprise / paid features (license, limits, stripe webhook).
- **`packages/app-tests`** — Playwright e2e suite and per-flow fixtures.
- **`packages/lib/translations`** — i18n message catalogues.
- **`scripts/`** — repo-level Node scripts (scratch users, plans, justifications).
- **`.context/`** — generated codebase map, agent playbooks, and skills.

## Technology Stack Summary

- **Runtime**: Node.js 20+, TypeScript strict everywhere.
- **Web Framework**: Remix with Vite (`@remix-run/*`), file-based routes under `apps/remix/app/routes`.
- **Server Router**: Hono for low-level HTTP routing; tRPC v11 for typed RPC.
- **Database**: PostgreSQL via Prisma (`packages/prisma`); generated Zod schemas shipped alongside.
- **Jobs / Queues**: Pluggable — Inngest (cloud), BullMQ + Redis (self-hosted), or Local (dev/CI). Background work covers sealing, sending emails, webhooks, AI detection, and cert generation.
- **PDF Pipeline**: `pyppeteer` / headless Chromium HTML→PDF, `pdf-lib` for stamping/signatures, `konva` for canvas rendering, `Skia` for AI rasterisation.
- **Email**: `nodemailer` with SMTP and MailChannels transport (`packages/email/transports`).
- **Storage**: S3 and Azure Blob providers; uploads abstracted through `packages/lib/universal/upload`.
- **Auth**: cookies/sessions via `packages/auth`, 2FA (TOTP + email), passkeys (WebAuthn), recipient-access tokens.
- **Payments**: Stripe (`packages/lib/server-only/stripe`) with webhooks and internal claims.
- **AI**: optional envelope/field detection (`packages/lib/server-only/ai/*`) with Konva/Skia rasterisation.
- **Tooling**: pnpm workspaces, Playwright e2e, Vitest unit, ESLint + Prettier.

## Core Framework Stack

- **Backend**: Remix loaders/actions + tRPC routers; Hono for HTTP layering; Prisma for persistence; pluggable job runner for async work.
- **Frontend**: React 18, Tailwind via `packages/tailwind-config`, Radix primitives, react-pdf for in-browser preview, react-konva for field placement.
- **State / Data**: tRPC queries with `superjson`; `react-hook-form` + Zod for forms; command menus and toasts live in `packages/ui`.
- **i18n**: `packages/lib/translations` message catalogues injected via `packages/lib/client-only/providers`; default `pt-BR`.

## UI & Interaction Libraries

- **Design system**: `packages/ui` exports a Tailwind-based component library (buttons, dialogs, command menus, tables, toasts, file uploaders, signatures).
- **Wizards**: `packages/ui/primitives/document-flow` and `template-flow` orchestrate multi-step envelope creation.
- **PDF**: `pdf-viewer` and `react-pdf` render documents in browser; signature pad primitives support mouse/touch draw, type, and upload.
- **Theming**: dark/light via CSS variables; recipient color tokens centralised in `packages/ui/lib/recipient-colors.ts`.
- **Accessibility**: Radix primitives provide keyboard/focus management; signing pages expose ARIA labels on field placeholders.

## Development Tools Overview

- **Package manager**: pnpm with workspaces.
- **Task runner**: pnpm scripts (root + per-package) — `dev`, `build`, `lint`, `test`, `test:e2e`, `db:*`.
- **Database**: `prisma migrate dev` / `db:push`, `prisma db seed` for fixtures; `db:reset` to wipe.
- **Mail/Storage**: MailHog/SMTP via Docker, MinIO for local S3, or MailChannels for production.
- **Lint/Format**: ESLint + Prettier; `lint:fix` and `format` scripts.
- **Tests**: Vitest for unit (`packages/lib`, `packages/ui`), Playwright under `packages/app-tests` for e2e.

## Getting Started Checklist

1. Install dependencies: `pnpm install`.
2. Provision environment: copy `.env.example` files (root, `apps/remix`, `apps/docs`, `apps/openpage-api`) and fill in DB, Redis, SMTP, and (optionally) Stripe / S3 / Inngest credentials.
3. Start the database: `docker compose up -d postgres redis minio mailhog` (or your local equivalent), then `pnpm db:push` and `pnpm db:seed`.
4. Run the web app: `pnpm dev` (boots Remix, docs, and openpage-api in parallel).
5. Run unit tests: `pnpm test`, and e2e: `pnpm test:e2e` (Playwright in `packages/app-tests`).
6. Review [architecture.md](architecture.md), [development-workflow.md](development-workflow.md), and [tooling.md](tooling.md) before opening a PR.

## Next Steps

- See [architecture.md](architecture.md) for layered design and module boundaries.
- See [data-flow.md](data-flow.md) for end-to-end document signing flows.
- See [glossary.md](glossary.md) for domain terms (envelope, recipient, field, sealing, etc.).
- See [security.md](security.md) for auth, secrets, and audit-log expectations.
