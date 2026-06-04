---
type: skill
name: Api Design
description: Design RESTful APIs following best practices for the BchatSign REST v1 and tRPC surfaces
skillSlug: api-design
phases: [P, R]
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Pick the surface** — internal UI code uses tRPC (`packages/trpc/server/*-router/`); partner/external integrations use REST v1 (`packages/api/v1`); webhooks and internal endpoints use Hono (`apps/remix/server/router.ts`, `apps/remix/server/api/**`).
2. **Define the resource** — reuse the entity in `packages/lib/server-only/<entity>/` and the type from `packages/prisma/types/`. Map to a URL or procedure name.
3. **Choose the verb** — tRPC procedures (`list`, `get`, `create`, `update`, `delete`); REST verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`); Hono `app.get`, `app.post`, etc.
4. **Design the URL** — REST: `/api/v1/<resource>` (e.g. `GET /api/v1/templates`); tRPC: `appRouter.<entity>.<verb>` (e.g. `appRouter.templateRouter.list`); Hono: `/api/<noun>` (e.g. `POST /api/webhook/trigger`).
5. **Validate the input** — Zod schemas from `packages/prisma/generated/zod` for entity DTOs; ad-hoc schemas in `packages/lib/schemas` for cross-entity inputs.
6. **Authorise the call** — `ctx.user` for session auth; `ApiToken` for REST; recipient token resolution for token URLs; `LicenseClient` for EE features.
7. **Standardise the error** — throw `AppError` with a typed `AppErrorCode` from `packages/lib/errors/app-error.ts`; the Hono / tRPC error handlers convert to JSON.
8. **Plan the response** — REST: `{ data, meta }` with pagination; tRPC: procedure return type; Hono: status code + JSON body.
9. **Document** — public REST in `apps/docs`; tRPC surface in `.context/docs/architecture.md`; Hono routes in the inline JSDoc.

## Examples

**REST endpoint (envelopes):**
```http
GET /api/v1/envelopes?page=1&status=COMPLETED&teamId=42
Authorization: Bearer <api-token>

200 OK
{
  "data": [
    { "id": "env_123", "title": "NDA", "status": "COMPLETED", "createdAt": "03/06/2026 14:30" }
  ],
  "meta": { "page": 1, "perPage": 25, "total": 132 }
}
```

**tRPC procedure:**
```typescript
// packages/trpc/server/envelope-router/list-envelopes.ts
export const listEnvelopesProcedure = authenticatedProcedure
  .input(
    z.object({
      teamId: z.number().int().positive().optional(),
      status: z.nativeEnum(DocumentStatus).optional(),
      page: z.number().int().positive().default(1),
      perPage: z.number().int().positive().max(100).default(25),
    }),
  )
  .query(async ({ input, ctx }) => {
    return findEnvelopes({ ...input, organisationId: ctx.organisation.id });
  });
```

**Hono webhook receiver:**
```typescript
// apps/remix/server/api/files/routes/upload.ts
app.post('/upload', authMiddleware, rateLimitMiddleware, async (c) => {
  const body = uploadSchema.parse(await c.req.parseBody());
  const file = await S3Provider.put(body.key, body.stream);
  return c.json({ data: { id: file.id, url: file.url } }, 201);
});
```

## Quality Bar

- **Resource-oriented** — URLs name resources, not verbs. Procedures use `get`/`list`/`create`/`update`/`delete`.
- **Stable surface** — REST v1 and tRPC procedure names are public contracts; breaking changes require a new version or a new procedure.
- **Zod first** — every input is validated with a Zod schema, ideally re-exported from `packages/prisma/generated/zod`.
- **Tenancy enforced** — every query is scoped by `userId`, `teamId`, or `organisationId`; recipient URLs resolve identity from the token.
- **Standardised errors** — `AppError` with `AppErrorCode`; the error handlers map to HTTP status codes.
- **Pagination** — `page` / `perPage` / `meta.total` for REST; cursors for very large lists.
- **Rate limits** — `packages/lib/server-only/rate-limit` for auth, signing, password reset, and webhook endpoints.
- **Captcha** — public sign-up and password reset pass through `packages/lib/server-only/captcha` when configured.
- **i18n** — server-returned messages use translation keys; resolved at the edge.
- **Audit log** — every state transition writes a row.
- **EE gating** — paid features guarded by `LicenseClient`; absent license ⇒ feature absent, not broken.

## Resource Strategy

- Add `scripts/` only when the task is fragile, repetitive, or benefits from deterministic execution.
- Add `references/` only when details are too large or too variant-specific to keep in `SKILL.md`.
- Add `assets/` only for files that will be consumed in the final output.
- Keep extra docs out of the skill folder; prefer `SKILL.md` plus only the resources that materially help.
