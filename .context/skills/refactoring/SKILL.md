---
type: skill
name: Refactoring
description: Refactor code safely with a step-by-step approach in the BchatSign monorepo
skillSlug: refactoring
phases: [E]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Establish a baseline** — `pnpm test` and the relevant e2e flow must pass before any refactor.
2. **Identify the specific improvement** — duplication, long methods, primitive obsession, feature envy, shotgun surgery.
3. **Define the target shape** — write the new structure as a sibling file first; do not edit the old one yet.
4. **Make one type of change at a time** — extract function, move module, rename, collapse duplicate, then commit.
5. **Run tests after each change** — `pnpm test` and the focused e2e flow.
6. **Commit frequently with clear messages** — Conventional Commits with a `refactor(<scope>):` subject.
7. **Verify no behaviour change** — the audit log shape, the tRPC surface, and the recipient URL are unchanged.
8. **Delete the old code** — no `// removed` comments; no `_unused` exports.

## Examples

**Extract service function:**
```typescript
// Before: inline Prisma in a tRPC procedure
const envelope = await prisma.envelope.findUnique({ where: { id: input.id } });
if (!envelope) throw new Error('not found');

// After: call the service
const envelope = await getEnvelopeById({ id: input.id, userId: ctx.user.id });
if (!envelope) throw new AppError(AppErrorCode.NOT_FOUND);
```

**Collapse parallel document/ and envelope/ services:**
```typescript
// Before
// packages/lib/server-only/document/duplicate-document.ts
// packages/lib/server-only/envelope/duplicate-envelope.ts
// (two near-identical implementations)

// After: collapse to envelope; document/* becomes a re-export
export { duplicateEnvelope as duplicateDocument } from '../envelope/duplicate-envelope';
```

**Move inline logic to a job:**
```typescript
// Before: synchronous sealing in the request
await sealPdfInProcess(envelope);

// After: dispatch to the job runner
await jobs.dispatch('seal-document', { envelopeId: envelope.id, userId: ctx.user.id });
```

## Quality Bar

- **Never refactor without tests** — establish a green baseline first; the refactor must keep it green.
- **Small steps, frequent commits** — one refactor type per commit; Conventional Commits subject.
- **One refactoring type per commit** — extract, move, rename, collapse, then the next.
- **If tests break, you changed behaviour** — revert and reconsider; behaviour change is not a refactor.
- **Use IDE refactoring tools when available** — TypeScript Language Service rename, move, extract.
- **Keep the PR focused and reviewable** — drive-by refactors are forbidden in feature PRs.
- **Preserve the audit log shape** — never rewrite rows; never change the column meaning in a refactor.
- **Preserve the public surface** — REST v1 paths, tRPC procedure names, recipient URL shapes are public contracts.
- **Reuse the entity folders** — no parallel "v2" folders; extend the canonical one.
- **No backwards-compat shims in OSS builds** — EE code under `packages/ee`; OSS code under `packages/lib`.
- **Confirm the sensor set is unchanged** — refactors must not weaken `.context/harness/sensors.json`.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
