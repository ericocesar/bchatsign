---
type: skill
name: Documentation
description: Generate and update technical documentation for BchatSign (public docs, .context/docs/, READMEs, runbooks)
skillSlug: documentation
phases: [P, C]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Identify the audience** — public user (apps/docs), internal developer (.context/docs/), support engineer, or admin. Pick the right surface.
2. **Source from the code** — read the service, the tRPC procedure, and the audit log. Never infer from the previous version of the docs.
3. **Pick the structure**:
   - **Public docs** (MDX in `apps/docs/src/app/docs/[[...slug]]`): Hero → Quickstart → Concepts → Tasks → Reference → FAQ.
   - **Internal docs** (`.context/docs/`): Overview → Architecture → Data flow → Glossary → Conventions.
   - **Runbooks** (per-package `RUNBOOK.md` or `docs/runbooks/`): Symptom → Cause → Detection → Mitigation → Rollback.
4. **Write the doc** — one sentence per paragraph in the lead; H2/H3 hierarchy; code blocks for commands; callouts for gotchas.
5. **Cross-reference** — link to other docs and to the source file with `path:line` so future readers can verify.
6. **Localise** when UI strings are involved — entries must exist in every locale under `packages/lib/translations/`.
7. **Validate** — `pnpm dev` for the docs site; spot-check links and search; the search endpoint lives at `apps/docs/src/app/api/search`.
8. **Update the semantic snapshot** if the doc is architecture-grade — `context({ action: "getMap", section: "all" })`.

## Examples

**Public docs page (envelope creation):**
```mdx
---
title: Create and send an envelope
description: How to prepare a PDF, add signers, and send it for signing.
---

import { Callout } from '@documenso/ui';

# Create and send an envelope

BchatSign envelopes are the central object: a container for one or more PDFs, a
list of recipients, and the fields each recipient must complete.

<Callout type="info">
  The default locale is `pt-BR` and dates render as `DD/MM/YYYY HH:mm`.
</Callout>

## Quickstart

1. From the dashboard, click **New envelope**.
2. Upload the PDF. The wizard (`packages/ui/primitives/document-flow`) guides
   you through adding signers, fields, and settings.
3. Click **Send**. Recipients receive an email with a token URL
   (`/sign.<token>`).

## Tasks

### Add a signer

1. In the **Add signers** step, click **Add recipient**.
2. Enter the recipient's name and email.
3. (Optional) Set the access auth: account required, email link, passkey, or
   2FA. See [Recipient auth options](#recipient-auth-options).

### Add a field

1. In the **Add fields** step, drag a field onto the PDF.
2. Pick the recipient and the field type (signature, initials, name, email,
   date, text, number, checkbox, radio, dropdown, image).
3. Configure advanced settings per field.
```

**Internal architecture doc (.context/docs/architecture.md):**
```md
## Service Layer

- **Envelope lifecycle**: `packages/lib/server-only/envelope/{create-envelope,seal-envelope,duplicate-envelope,redirect-envelope,set-envelope-items}.ts`
- **Document flow (legacy)**: `packages/lib/server-only/document/*` — re-exports to envelope where possible.
- **Templates**: `packages/lib/server-only/template/{create-document-from-template,create-document-from-direct-template,duplicate-template}.ts`
- **Recipients & fields**: `packages/lib/server-only/recipient/*`, `packages/lib/server-only/field/*`
- **Webhooks**: `packages/lib/server-only/webhooks/{create-webhook,trigger/*}.ts`
- **AI**: `packages/lib/server-only/ai/{envelope/detect-recipients,envelope/detect-fields,pdf-to-images}.ts`
```

**Runbook (sealing job):**
```md
# Runbook: sealing job backlog

## Symptom
- The admin jobs table shows `seal-document.handler` with `FAILED` status.
- Users see "Envelope stuck in PENDING" complaints.

## Cause
- Headless Chromium is OOM.
- S3 / Azure Blob credentials expired.
- The recipient's signed PDF is over the storage provider's max object size.

## Detection
- Sentry tag `job=seal-document` and `outcome=error`.
- pganalyze: no DB-side bottleneck; the job hangs in `pyppeteer.launch`.

## Mitigation
1. Scale the sealing job runner horizontally.
2. Rotate the storage credentials.
3. Re-dispatch the failed jobs from the admin jobs table.

## Rollback
- Cancel the failed jobs; revert the `seal-document` handler to the previous
  version with `git revert`.
```

## Quality Bar

- **Source from the code** — never paraphrase a previous version of the doc.
- **One sentence per paragraph in the lead** — the first paragraph is the contract.
- **Use H2/H3 hierarchy; no orphan H1s**.
- **Code blocks for commands; flags inline**.
- **Callouts for gotchas, prereqs, and security notes** — visible, not buried.
- **Cross-reference with `path:line`** — readers can verify against the code.
- **Localise when UI strings are involved** — every locale under `packages/lib/translations/`.
- **Date format in examples**: `DD/MM/YYYY HH:mm` for `pt-BR`; use `formatDate` in code blocks.
- **MDX primitives** — use `apps/docs/src/components/mdx` callouts, code blocks, and tabs.
- **Update `.context/docs/` when architecture changes** — the semantic snapshot is the source of truth.
- **Update the same PR as the code change** — docs are part of "done".

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
