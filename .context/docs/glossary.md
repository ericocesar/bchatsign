---
type: doc
name: glossary
description: Project terminology, type definitions, domain entities, and business rules
category: glossary
generated: 2026-06-03
status: filled
scaffoldVersion: "2.0.0"
---

# Glossary & Domain Concepts

BchatSign inherits the Documenso domain model and extends it with team/enterprise primitives, AI-assisted envelope creation, and an embeddable public surface. The vocabulary below is the contract used across the UI, tRPC, REST, and the job runner.

## Type Definitions

The most important exported types (selection):

- **`AppRouter`** — `packages/trpc/server/router.ts:36` — tRPC root router.
- **`TrpcContext`** — `packages/trpc/server/context.ts:70` — per-request context (user, session, prisma, jobs).
- **`Template`** — `packages/prisma/types/template-legacy-schema.ts:36` — persisted template (now a thin wrapper over `Envelope` of type `TEMPLATE`).
- **`Document`** — `packages/prisma/types/document-legacy-schema.ts:46` — legacy alias for an envelope in `DOCUMENT` status.
- **`EnvelopeWithRecipients` / `EnvelopeWithRecipient`** — `packages/prisma/types/document-with-recipient.ts:3,7`.
- **`FieldWithSignature`** / **`FieldWithSignatureAndFieldMeta`** — `packages/prisma/types/field-with-signature*.ts`.
- **`RecipientWithFields`** — `packages/prisma/types/recipient-with-fields.ts:3`.
- **`DocumentFormValues`** — `packages/prisma/types/types.d.ts:17` — UI form shape.
- **`DocumentAuthOptions`** — `packages/prisma/types/types.d.ts:18` — auth gating per envelope (ACCOUNT, EMAIL, PASSKEY, etc.).
- **`DocumentEmailSettings` / `DocumentEmailSettingsNullable`** — `packages/prisma/types/types.d.ts:19,20` — owner-controlled email preferences.
- **`RecipientAuthOptions`** — `packages/prisma/types/types.d.ts:22` — per-recipient access requirements.
- **`FieldMeta`** — `packages/prisma/types/types.d.ts:24` — coordinates, page, dimensions, type-specific metadata.
- **`EnvelopeAttachmentType`** — `packages/prisma/types/types.d.ts:26`.
- **`DefaultRecipient`** — `packages/prisma/types/types.d.ts:28` — placeholder recipient used in templates.
- **`ExtendedDocumentStatus`** — `packages/prisma/types/extended-document-status.ts:9` — UI-level status that may differ from `DocumentStatus`.
- **`SignOptions`** — `packages/signing/index.ts:14` — `signPdf` parameters.
- **`ClaimFlags`** — `packages/prisma/types/types.d.ts:15` — internal subscription claim flags.
- **`HonoEnv`** — `apps/remix/server/router.ts:40` — Hono bindings for the Remix server.
- **`DocumentFlowStep`** — `packages/ui/primitives/document-flow/types.ts:58` — step IDs in the document wizard.
- **`MailChannelsAddress` / `MailChannelsTransportOptions`** — `packages/email/transports/mailchannels.ts:10,15`.

## Enumerations

- **`DocumentStatus`** — `packages/prisma/generated/types.ts:77` — `DRAFT | PENDING | COMPLETED | CANCELLED | REJECTED`.
- **`DocumentSource`** — `packages/prisma/generated/types.ts:83` — `DOCUMENT | TEMPLATE | DIRECT_LINK`.
- **`DocumentSignatureType`** — `packages/lib/utils/teams.ts:16` — `DRAW | TYPE | UPLOAD`.
- **`INTERNAL_CLAIM_ID`** — `packages/lib/types/subscription.ts:127` — internal claim identifiers for Stripe sync.
- **`DocumentEmailEvents`** — `packages/lib/types/document-email.ts:5` — `SIGNING_REQUESTED | SIGNED | COMPLETED | ...`.
- **`AppErrorCode`** — `packages/lib/errors/app-error.ts:7` — error codes returned by the API.
- **`RecipientStatusType`** — `packages/lib/client-only/recipient-type.ts:6` — `NOT_SIGNED | SIGNED | APPROVED | REJECTED`.
- **`STRIPE_PLAN_TYPE`** — `packages/lib/constants/billing.ts:4` — `FREE | TEAM | ENTERPRISE`.
- **`CheckboxValidationRules`** — `packages/ui/primitives/document-flow/field-items-advanced-settings/constants.ts:19`.
- **`WebhookTriggerEvents`** — `packages/prisma/generated/types.ts:55` — events that fan out to subscribers.
- **`WebhookCallStatus`** — `packages/prisma/generated/types.ts:60` — `PENDING | SUCCESS | FAILED`.
- **`ApiTokenAlgorithm`** — `packages/prisma/generated/types.ts:64` — `SHA256 | SHA512`.
- **`SubscriptionStatus`** — `packages/prisma/generated/types.ts:70`.
- **`UserSecurityAuditLogType`** — `packages/prisma/generated/types.ts:38` — `PASSWORD_RESET | EMAIL_CHANGE | 2FA_* | ...`.
- **`Role`** — `packages/prisma/generated/types.ts:17` — `ADMIN | MEMBER | ...`.
- **`IdentityProvider`** — `packages/prisma/generated/types.ts:12` — `EMAIL | GOOGLE | MICROSOFT | OIDC | PASSKEY`.
- **`Generated` / `Timestamp`** — `packages/prisma/generated/types.ts:2,5`.

## Core Terms

- **Envelope** — the central domain entity. A container for one or more PDF items plus recipients, fields, audit log, and (for templates) placeholder metadata. Implemented in `packages/lib/server-only/envelope` and `packages/prisma/schema.prisma` (model `Envelope`).
- **Document** — legacy alias of an envelope of source `DOCUMENT`. Code under `packages/lib/server-only/document` is the parallel service layer for backwards compatibility; new code should target `envelope`.
- **Template** — an envelope with `source = TEMPLATE`; the same `Envelope` table, with `DirectTemplate` providing tokenised direct-link variants.
- **Recipient** — a person assigned to an envelope; has a role, an order, an auth option, and a tokenised URL. Modeled by `Recipient` and services in `packages/lib/server-only/recipient`.
- **Field** — a placeholder or signed value bound to a recipient at a coordinate on a page. Includes `Signature`, `Initials`, `Name`, `Email`, `Date`, `Text`, `Number`, `Checkbox`, `Radio`, `Dropdown`, `Image`.
- **Sealing** — the async job that turns a fully-signed envelope into a completed PDF, writes the audit log, and dispatches completion emails + webhooks. Job: `seal-document.handler.ts`.
- **Audit Log** — append-only event log per envelope surfaced in the admin tools and recipient UI.
- **Signing token / recipient URL** — signed token (`/sign.<token>`, `/d.<token>`) that grants access to a specific recipient's view of an envelope. Validated by `getRecipientByToken` / `getDocumentByToken`.
- **Document flow** — the multi-step wizard at `/signing/create` and via `packages/ui/primitives/document-flow`. Steps include `add-subject`, `add-signers`, `add-fields`, `add-settings`.
- **Template flow** — analogous wizard for templates, in `packages/ui/primitives/template-flow`.
- **Embedding** — iframe-friendly authoring + multisign flows mounted at `/embed/v1/{authoring,multisign}` and `/embed/v2/authoring`. Designed for partner integrations.
- **AI assistant** — opt-in feature that proposes recipients and fields from a PDF. Lives in `packages/lib/server-only/ai/envelope` and is exposed via `apps/remix/server/api/ai/*`.
- **Webhook** — outbound HTTP call fired on `WebhookTriggerEvents`. Configured per team and delivered with retries through `packages/lib/server-only/webhooks/trigger`.
- **Workspace / Team** — `Team` model with `organisationId`, `teamUrl`, and member roles. Routes scoped under `/_authenticated/t.$teamUrl+`.
- **Organisation** — billing entity; subscription lives on the org via Stripe.
- **Folder** — per-user/per-team folder to organise envelopes and templates. Modeled by `Folder` with breadcrumb support.
- **Service Account** — non-human API actor; see `packages/lib/server-only/user/service-accounts`.
- **License** — EE gating primitive; checked via `LicenseClient` (`packages/lib/server-only/license`).
- **Limits** — feature caps (envelopes/month, members, custom branding) resolved by `packages/ee/server-only/limits`.
- **Direct template** — a template variant accessible by anyone with its token, without an account (`packages/lib/server-only/template/create-document-from-direct-template.ts`).
- **API token** — long-lived token used by the REST v1 surface, hashed server-side and identified by `ApiTokenAlgorithm`.
- **Passkey** — WebAuthn authenticator; `packages/lib/server-only/auth/update-passkey.ts` and `packages/auth/server`.
- **2FA** — TOTP and email-based; gated by `DocumentAuthOptions.ACCESS_AUTH` and `RecipientAuthOptions`.
- **EE / OSS** — `packages/ee` holds enterprise-only code; the OSS build is the same codebase minus EE routes and gated features.

## Acronyms & Abbreviations

- **tRPC** — Typed RPC framework used for all client→server mutations and queries.
- **EE** — Enterprise Edition (paid features under `packages/ee`).
- **TSA** — Time-Stamp Authority (RFC 3161).
- **KMS** — Key Management Service (Google Cloud KMS in our signing transport).
- **OSS** — Open-source software (the public-facing default build).
- **CRUD** — Create/Read/Update/Delete; the service-layer pattern.
- **PII** — Personally Identifiable Information (recipient name, email, phone, document data).
- **CMS** — Content Management System (not used directly; marketing copy in `apps/docs`).
- **PNA** — Passkey / Number Auth (used in some 2FA flows).
- **MRR** — Monthly Recurring Revenue (metric surfaced in `apps/openpage-api`).
- **LTV** — Lifetime Value (kept for analytics dashboards).

## Personas / Actors

- **Sender / Owner** — authenticated user creating and sending envelopes. Manages team, billing, templates, folders, and webhooks.
- **Recipient / Signer** — external or internal person opening a token URL to view and sign. May need to authenticate (account, email, passkey) depending on envelope settings.
- **Team Admin** — manages members, roles, branding, API tokens, and webhooks for a team.
- **Super Admin** — platform-wide operator; uses admin tools (`/_authenticated/admin+/*`) to inspect users, claims, jobs, and unsealed documents.
- **Partner / Embed caller** — third-party app embedding the authoring or signing flows; talks to embedding routes or the public REST API.
- **AI assistant** — opt-in role for the AI provider that proposes recipients/fields; never auto-signs, only suggests.

## Domain Rules & Invariants

- **Recipient ordering** — recipients with `role = SIGNER` are ordered; their order is part of the audit trail.
- **All-recipients-complete ⇒ seal** — sealing is triggered only when every required recipient has reached a terminal state.
- **Rejection freezes the envelope** — a single `REJECTED` recipient invalidates the envelope; the owner must issue a new one.
- **Tokens are secrets** — recipient tokens grant signing access; rotate by reissuing the envelope, never reuse.
- **Field coordinates are in PDF user space** — coordinates are stored relative to the original PDF page size and re-mapped on sealing.
- **Document data is immutable per version** — uploaded PDFs are content-addressed; re-uploads create a new `DocumentData` row.
- **Audit log is append-only** — never delete or rewrite rows; corrections are new rows.
- **Subscriptions are org-scoped** — billing lives on the organisation, not the team or the user.
- **i18n** — every user-facing string lives in `packages/lib/translations/<locale>/...`; default locale is `pt-BR`; the date format is `DD/MM/YYYY HH:mm`.
- **EE features** — must be guarded by `LicenseClient` checks; never assume a license is present in OSS builds.
- **API auth** — REST v1 endpoints require an `ApiToken`; rate limits apply per token.
- **Webhook signing** — outbound webhooks include an HMAC header; consumers must verify before acting.
- **Migration safety** — Prisma migrations are forward-only; backfills are explicit scripts and never destructive without notice.

## Related Resources

- [project-overview.md](project-overview.md) — high-level context.
- [data-flow.md](data-flow.md) — end-to-end pipeline.
- [security.md](security.md) — auth, audit, and compliance notes.
