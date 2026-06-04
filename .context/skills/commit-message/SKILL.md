---
type: skill
name: Commit Message
description: Generate commit messages that follow Conventional Commits and BchatSign repository conventions
skillSlug: commit-message
phases: [E, C]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Review the staged changes** with `git diff --staged` and `git diff --stat --staged`.
2. **Identify the type**:
   - `feat` — new feature
   - `fix` — bug fix
   - `chore` — tooling, dependencies, config
   - `refactor` — no behaviour change
   - `docs` — documentation only
   - `test` — tests only
   - `perf` — performance
   - `build` — build system / CI
   - `style` — formatting only
   - `revert` — revert a previous commit
3. **Determine the scope** — the entity, package, or layer affected:
   - `envelope`, `document`, `recipient`, `field`, `team`, `organisation`, `template`, `folder`, `webhook`, `auth`, `billing`, `ai`, `embed`, `i18n`, `prisma`, `remix`, `docs`, `ci`, `release`.
4. **Write a subject line** in imperative mood, ≤ 72 characters, no period.
5. **Add a body** that explains the *why* — the audit log impact, the migration, the EE gating, the user-visible change. Reference the issue.
6. **Reference issues** with `Closes #N`, `Fixes #N`, or `Refs #N`.
7. **One logical change per commit** — split UI, service, schema, and i18n when they can stand alone.

## Examples

**Feature commit (envelope):**
```
feat(envelope): add per-recipient auth options to wizard

Add `DocumentAuthOptions.RECIPIENT_AUTH` UI in the document-flow add-signers
step. The recipient's auth requirement is persisted in `RecipientAuthOptions`
and resolved at signing time. Recipients can require account, email link,
passkey, or 2FA.

Closes #1242
```

**Bug fix commit (sealing):**
```
fix(seal): only dispatch seal-document.handler when envelope is complete

The new recipient flow dispatched the sealing job on every completion,
sealing after the first signer. Gate the dispatch on
`isEnvelopeComplete(envelopeId)` so all signers must reach a terminal
state before sealing. Adds regression test in
`packages/lib/server-only/envelope/__tests__/seal-envelope.test.ts`.

Fixes #1308
```

**Refactor commit (services):**
```
refactor(envelope): consolidate document/ and envelope/ services

Collapse the parallel `packages/lib/server-only/document/*` paths into
`packages/lib/server-only/envelope/*`. The `document/*` files are now
re-exports for backwards compatibility. No behaviour change; the public
tRPC surface and the audit log shape are preserved.
```

**i18n commit:**
```
feat(i18n): add pt-BR translations for the document-flow wizard

Translate the new wizard strings in `packages/lib/translations/pt-BR/`.
The default locale is now `pt-BR`; date format `DD/MM/YYYY HH:mm` is
applied via the `formatDate` helper.
```

## Quality Bar

- **Imperative mood**: "add" not "added" or "adds".
- **Subject line under 72 characters** (the team uses 72 to fit tooling output).
- **Separate subject from body with a blank line**.
- **Use the body to explain why, not what** — the diff shows what.
- **Reference issues with `Closes #N` or `Fixes #N`**.
- **One logical change per commit** — split UI, service, schema, and i18n when they can stand alone.
- **Don't end the subject with a period**.
- **Co-Authored-By trailer** when pairing; the `commit-message` skill adds it automatically.
- **Bump or migration note in the body** when a Prisma migration is included.
- **No drive-by formatting in a feature commit** — keep formatting changes in their own `style:` commit.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
