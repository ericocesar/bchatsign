---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code in the BchatSign monorepo
skillSlug: test-generation
phases: [E, V]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Identify the function/component to test** — service in `packages/lib/server-only/<entity>/`, tRPC procedure, job handler, or React component.
2. **List the behaviours that need testing** — happy path, edge cases, error modes, tenancy boundaries, auth gates, audit log emissions.
3. **Write tests for happy path scenarios** — the user-visible behaviour the spec promises.
4. **Add tests for edge cases and boundaries** — empty input, max input, malformed input, expired tokens, missing license.
5. **Include error handling tests** — `AppError` with the right `AppErrorCode`; the tRPC / Hono error handler returns the right HTTP status.
6. **Mock external dependencies appropriately** — fake the `Base*Provider` (S3, Stripe, KMS, captcha, Inngest); do not call out to the network.
7. **Verify tests are deterministic and isolated** — fake the clock, reset the DB, use the `LocalJobProvider` for jobs.

## Examples

**Unit test (service):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createEnvelope } from '../create-envelope';
import { seedTestEmail } from '@documenso/prisma/seed/users';

describe('createEnvelope', () => {
  it('creates a draft envelope for an authenticated user', async () => {
    const user = await seedTestEmail();
    const envelope = await createEnvelope({
      title: 'NDA',
      userId: user.id,
    });
    expect(envelope.status).toBe('DRAFT');
    expect(envelope.source).toBe('DOCUMENT');
  });

  it('rejects when the user is outside the team scope', async () => {
    const user = await seedTestEmail();
    await expect(
      createEnvelope({ title: 'NDA', userId: user.id, teamId: 999_999 }),
    ).rejects.toMatchObject({ code: 'TENANT_FORBIDDEN' });
  });

  it('writes a CREATED audit log row', async () => {
    const user = await seedTestEmail();
    const envelope = await createEnvelope({ title: 'NDA', userId: user.id });
    const log = await prisma.documentAuditLog.findFirst({
      where: { envelopeId: envelope.id, type: 'CREATED' },
    });
    expect(log).not.toBeNull();
  });
});
```

**Integration test (job):**
```typescript
import { describe, it, expect } from 'vitest';
import { LocalJobProvider } from '@documenso/lib/jobs/client/local';
import { sealDocument } from '@documenso/lib/jobs/definitions/internal/seal-document.handler';

describe('seal-document', () => {
  it('produces a sealed PDF and writes COMPLETED to the audit log', async () => {
    const envelope = await seedCompletedEnvelope();
    const provider = new LocalJobProvider();
    await provider.run('seal-document', { envelopeId: envelope.id, userId: envelope.userId });
    const updated = await prisma.envelope.findUnique({ where: { id: envelope.id } });
    expect(updated?.status).toBe('COMPLETED');
    const log = await prisma.documentAuditLog.findFirst({
      where: { envelopeId: envelope.id, type: 'SEALED' },
    });
    expect(log).not.toBeNull();
  });
});
```

**Playwright (UI):**
```typescript
import { test, expect } from '@playwright/test';

test('add-signers step persists recipient auth options', async ({ page }) => {
  await page.goto('/signing/create');
  await page.getByTestId('add-recipient').click();
  await page.getByLabel('Name').fill('Alice');
  await page.getByLabel('Email').fill('alice@example.com');
  await page.getByLabel('Access auth').selectOption('PASSKEY');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.reload();
  await expect(page.getByLabel('Access auth')).toHaveValue('PASSKEY');
});
```

## Quality Bar

- **Test behaviour, not implementation** — assert on outputs, not internals.
- **Use descriptive test names that explain what and why** — `it('rejects when access auth is not satisfied')`.
- **Follow Arrange-Act-Assert** — setup, exercise, verify.
- **Keep tests independent and isolated** — reset the DB, fake the clock, do not share state.
- **Don't test external libraries** — trust Prisma, tRPC, Zod, and React.
- **Mock at the boundary, not everywhere** — fake the `Base*Provider`; do not mock internal helpers.
- **Aim for fast, reliable tests** — `LocalJobProvider` for jobs; in-memory fakes for providers.
- **Pin timezone and clock** — `vi.useFakeTimers()`; default `pt-BR` with `DD/MM/YYYY HH:mm`; use `formatDate`.
- **Regression tests for bug fixes** — must fail on the old code and pass on the new.
- **Tag smoke flows `@smoke`** — the fast feedback loop.
- **Coverage targets** — `packages/lib` 70% lines / 65% branches; critical services (signing, sealing, auth, billing) 90%+.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
