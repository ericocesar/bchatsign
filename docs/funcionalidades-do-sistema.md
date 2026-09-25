# Funcionalidades do Sistema

**BchatSign** é uma plataforma de assinatura eletrônica de documentos, open-source, com foco no mercado brasileiro (validação ICP-Brasil/ITI, métodos de autenticação como WhatsApp e Caixa Bchat). O sistema permite criar documentos, configurar campos de assinatura, enviar para destinatários assinarem, selar o PDF com assinatura digital (PAdES/CAdES com carimbo de tempo), gerar certificado de conclusão com QR code e manter trilha de auditoria completa.

A arquitetura é um monorepo (npm workspaces + Turborepo) com uma aplicação **Remix** (`apps/remix`), API **tRPC + OpenAPI v2** (`packages/trpc`), API **REST v1** legada com ts-rest (`packages/api`), dados em **PostgreSQL via Prisma** (`packages/prisma`), e pacotes de domínio para autenticação (`packages/auth`), assinatura digital (`packages/signing`), emails (`packages/email`), enterprise/EE (`packages/ee`) e lógica de negócio (`packages/lib`).

## Visão geral

| Funcionalidade | Categoria | Relevância |
| -------------- | --------- | ---------- |
| Envelopes: criação de documento com campos e destinatários (editor V2) | Funcionalidades principais | Alta |
| Envio/distribuição para assinatura e fluxo de assinatura do destinatário | Funcionalidades principais | Alta |
| Selagem digital do PDF, certificado de conclusão e QR de verificação | Funcionalidades principais | Alta |
| Audit logs do documento (PDF) e relatório ITI (ICP-Brasil) | Funcionalidades principais | Alta |
| Templates reutilizáveis e templates diretos (link público) | Funcionalidades principais | Alta |
| Organizações, times, membros, grupos e papéis | Usuários e equipes | Alta |
| Autenticação: email/senha, Google/Microsoft/OIDC, passkeys, 2FA | Autenticação e contas | Alta |
| API pública v1 (REST) e v2 (OpenAPI) com API tokens | Integrações | Alta |
| Webhooks com 13 eventos, logs e reenvio | Integrações | Alta |
| Planos, assinatura e billing com Stripe (EE) | Planos e pagamentos | Alta |
| Admin global: usuários, organizações, documentos, estatísticas | Administração | Média |
| Embed authoring e embed signing (multi-sign) | Integrações | Média |
| Detecção de campos/destinatários com IA (Vertex AI) | Funcionalidades principais | Média |
| Pastas aninhadas com pinning e operações em massa | Funcionalidades principais | Média |
| SSO via portal de autenticação OIDC da organização (EE) | Segurança e permissões | Média |
| Domínios de email com verificação DKIM e remetentes customizados (EE) | Configurações | Média |
| Envio em massa via CSV | Funcionalidades principais | Baixa |
| Captcha, auditoria de segurança da conta, rate limiting | Segurança e permissões | Média |

---

## Autenticação e contas

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Registro e login com email/senha | Cadastro com verificação de email (token por email), login com captcha e fluxo de "check email". | Alta | Todos os usuários | `packages/auth/server/routes/email-password.ts`, `packages/lib/server-only/captcha/verify-captcha.ts`, `apps/remix/app/routes/_unauthenticated+/signup.tsx`, `signin.tsx`, `verify-email.$token.tsx`, `check-email.tsx`, `team.verify.email.$token.tsx` |
| Login social (OAuth) | Login via Google, Microsoft e OIDC genérico (configurável por env), com callback e verificação opcional de email. | Alta | Todos os usuários | `packages/auth/server/config.ts` (GoogleAuthOptions, MicrosoftAuthOptions, OidcAuthOptions), `packages/auth/server/routes/oauth.ts`, `handle-oauth-callback-url.ts` |
| Recuperação e troca de senha | Fluxo de esqueci minha senha com token único e expiração, email de confirmação e atualização. | Alta | Todos os usuários | `packages/lib/server-only/auth/send-forgot-password.ts`, `send-reset-password.ts`, rotas `forgot-password.tsx` e `reset-password.$token.tsx`, templates `forgot-password.tsx`/`reset-password.tsx` |
| Passkeys (WebAuthn) | Registro, listagem, renomeação e exclusão de passkeys para login sem senha (com opções de autenticação/registro/sign-in). | Média | Todos os usuários | `packages/trpc/server/auth-router/router.ts` (passkey.*), `apps/remix/app/routes/_authenticated+/settings+/security.passkeys.tsx`, modelo `Passkey` em `packages/prisma/schema.prisma` |
| Autenticação em dois fatores (2FA TOTP) | Habilitar/desabilitar 2FA com app autenticador, códigos de recuperação, validação de token e backup codes. | Alta | Todos os usuários | `packages/lib/server-only/2fa/` (setup-2fa, enable-2fa, disable-2fa, verify-backup-code…), `security._index.tsx`, modelos `twoFactorSecret/twoFactorEnabled/twoFactorBackupCodes` em `User` |
| Gerenciamento de sessões | Listagem de sessões ativas com IP/user-agent, revogação de sessão individual. | Média | Todos os usuários | `apps/remix/app/routes/_authenticated+/settings+/security.sessions.tsx`, `packages/auth/server/lib/session/session.ts`, modelo `Session` |
| Auditoria de segurança da conta | Registro de eventos de segurança (login, falha de login, 2FA, passkeys, reset de senha, revogação de sessão) com IP e user-agent. | Média | Todos os usuários | `packages/trpc/server/profile-router/router.ts` (`findUserSecurityAuditLogs`), `security.activity.tsx`, enum `UserSecurityAuditLogType` e modelo `UserSecurityAuditLog` |
| Vínculo/desvínculo de contas | Vincular conta de organização (SSO) e listar contas vinculadas. | Baixa | Usuários Enterprise | `security.linked-accounts.tsx`, `link-organisation-account.ts`, `decline-link-organisation-account.ts` |
| Exclusão de conta | Autocadastro de exclusão definitiva da conta pelo usuário. | Média | Todos os usuários | `profileRouter.deleteAccount` em `profile-router/router.ts`, `packages/lib/server-only/user/delete-user.ts` |

---

## Usuários e equipes

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Organizações | Criação, edição, exclusão e saída de organizações, com tipos pessoal/empresa e proprietário (owner). | Alta | Todos os usuários | `packages/trpc/server/organisation-router/router.ts` (get/getMany/create/update/delete/leave), rotas `o.$orgUrl.*`, modelo `Organisation` |
| Membros e convites da organização | Gerenciamento de membros (papéis ADMIN/MANAGER/MEMBER), convites por email com aceitar/declinar/reenvio e exclusão em massa. | Alta | Admins de organização | `organisation-router` `member.*` (find/update/delete/deleteMany/invite.*), rotas `organisation.invite.$token.tsx` e `organisation.decline.$token.tsx`, modelos `OrganisationMember`, `OrganisationMemberInvite` |
| Times | Times dentro de organizações, com CRUD, membros, grupos e configurações próprias. | Alta | Todos os usuários | `packages/trpc/server/team-router/router.ts` (find/get/create/update/delete, member.*, group.*, settings.*), rotas `t.$teamUrl+`, modelo `Team` |
| Papéis e permissões por papel | Papéis ADMIN/MANAGER/MEMBER em organização e time, com matriz de permissões por ação (utilidades `canExecute*Action`). | Alta | Admins de organização/time | `packages/lib/utils/organisations.ts`, `packages/lib/utils/teams.ts`, enums `OrganisationMemberRole`, `TeamMemberRole` |
| Grupos de organização e time | Grupos nomeados que agrupam membros e definem papéis de forma reutilizável. | Média | Admins de organização/time | `organisation-router` `group.*`, `team-router` `group.*`, rotas `o.$orgUrl.settings.groups.*`, modelos `OrganisationGroup`, `TeamGroup`, `OrganisationGroupMember` |
| Email do time (remetente customizado) | Configurar email próprio do time (ex.: `contato@empresa.com`) com verificação por token e envio de documentos em nome do time. | Média | Todos os times | `team-router` `email.*` e `email.verification.*`, `create-team-email-verification.ts`, modelos `TeamEmail`, `TeamEmailVerification`, template `confirm-team-email.tsx` |
| Perfil público do time | Perfil público do time (bio, ativação) exibido a terceiros. | Baixa | Times | `packages/lib/server-only/team/update-team-public-profile.ts`, `get-team-public-profile.ts`, `t.$teamUrl/settings.public-profile.tsx`, modelo `TeamProfile` |
| Inbox pessoal | Lista de documentos em que o usuário foi adicionado como destinatário, com contador. | Média | Todos os usuários | `document-router` `inbox.find`/`inbox.getCount`, `apps/remix/app/routes/_authenticated+/inbox.tsx` |
| Suporte ao cliente | Envio de ticket de suporte com assunto/mensagem e contexto de organização/time. | Baixa | Todos os usuários | `profileRouter.submitSupportTicket`, `o.$orgUrl.support.tsx`, `packages/lib/server-only/user/submit-support-ticket.ts` |

---

## Funcionalidades principais do produto

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Envelopes: criação de documentos com itens, campos e destinatários | Editor V2 de envelope: upload de PDF/DOCX (conversão automática), múltiplos itens (documentos) por envelope, configuração de campos arrastáveis e destinatários. | Alta | Todos os usuários | `packages/trpc/server/envelope-router/router.ts` (create/use/update/item.*, field.*, recipient.*), `apps/remix/app/components/general/envelope-editor/`, rota `t.$teamUrl/documents.$id.edit.tsx`, `packages/lib/server-only/document-conversion/index.tsx` |
| Tipos de campos de assinatura | 11 tipos: assinatura, assinatura livre, iniciais, nome, email, data, texto, número, radio, checkbox e dropdown, com configurações avançadas por campo. | Alta | Todos os usuários | Enum `FieldType` em `schema.prisma`, componentes `document-signing-*-field.tsx`, `packages/lib/server-only/advanced-fields-validation/` |
| Envio/distribuição para assinatura | Envio do documento aos destinatários por email (ou sem email), validação de campos e destinatários, webhooks e jobs de selagem. | Alta | Todos os usuários | `packages/lib/server-only/document/send-document.ts`, `distribute-envelope`, `packages/email/templates/document-invite.tsx`, `DocumentDistributionMethod` |
| Fluxo de assinatura do destinatário | Página pública por token para assinar: autenticação de acesso (conta/passkey/2FA/senha), preenchimento de campos, geolocalização, auto-assinatura e telas de conclusão/expiração/rejeição. | Alta | Destinatários e remetentes | `apps/remix/app/routes/_recipient+/sign.$token+/`, `d.$token+/`, componentes `document-signing-*`, `get-envelope-for-recipient-signing.ts` |
| Ordem e papéis de assinatura | Ordem paralela ou sequencial de assinatura; papéis de destinatário: SIGNER, CC, VIEWER, APPROVER e ASSISTANT. | Alta | Todos os usuários | Enums `DocumentSigningOrder`, `RecipientRole` em `schema.prisma`, `get-is-recipient-turn.ts`, `get-next-pending-recipient.ts` |
| Rejeição de documento | Destinatário pode rejeitar o documento com motivo; email de confirmação e carimbo de rejeição no PDF. | Alta | Todos os usuários | `reject-document-with-token.ts`, `document-signing-reject-dialog.tsx`, `add-rejection-stamp-to-pdf.ts`, template `document-rejected.tsx` |
| Expiração e lembretes | Expiração configurável por período (dias/meses), lembretes automáticos de assinatura pendente com jobs de varredura. | Média | Todos os usuários | `packages/lib/constants/envelope-expiration.ts`, `envelope-reminder.ts`, jobs `expire-recipients-sweep`, `process-signing-reminder`, `send-signing-reminders-sweep`, campos `expiresAt/nextReminderAt` em `Recipient` |
| Selagem digital do PDF | Assinatura digital PAdES/CAdES do PDF final com certificado e carimbo de tempo (TSA), via transporte local ou Google Cloud HSM. | Alta | Todos os usuários | `packages/lib/jobs/definitions/internal/seal-document.handler.ts`, `packages/signing/index.ts` (`signPdf`, transportes `local`/`gcloud-hsm`) |
| Certificado de conclusão | Certificado em PDF com resumo da evidência, QR code para verificação pública e opção de todas as páginas/posição. | Alta | Todos os usuários | `packages/lib/server-only/pdf/render-certificate.ts`, `generate-certificate-pdf.ts`, `downloadDocumentCertificate`, `document-certificate-qr-view.tsx`, rota `api+/certificate-status.ts` |
| Verificação pública por QR/share | Página pública com QR (slug `qr_*`/share) para verificar o documento assinado e certificado. | Alta | Destinatários e terceiros | `apps/remix/app/routes/_share+/share.$slug.tsx`, `share.$slug.opengraph.tsx`, `DocumentShareLink`, `get-document-by-access-token.ts` |
| Audit logs do documento | Trilha de auditoria completa por evento (criado, enviado, aberto, assinado, rejeitado, etc.) com download em PDF. | Alta | Todos os usuários | `find-envelope-audit-logs`, `downloadDocumentAuditLogs`, `packages/lib/server-only/pdf/render-audit-logs.ts`, `generate-audit-log-pdf.ts`, modelo `DocumentAuditLog` |
| Relatório ITI (ICP-Brasil) | Upload, extração e validação de relatórios ITI (Instituto de Tecnologia da Informação) com contagem de assinaturas ancoradas e certificado. | Média | Organizações brasileiras | `packages/trpc/server/envelope-router/iti-report.ts` (uploadItiReport/extractItiReport/mintSealedPdfToken), `packages/lib/server-only/validation/iti-report-*`, modelo `EnvelopeItem.iti*` |
| Templates reutilizáveis | Criação de templates (documento + campos + destinatários) reutilizáveis, com tipos público/privado/organização, busca, duplicação e uso para gerar documentos. | Alta | Todos os usuários | `packages/trpc/server/template-router/router.ts` (createTemplate, findTemplates, getTemplateById, duplicateTemplate, createDocumentFromTemplate), rotas `templates.*`, enum `TemplateType` |
| Templates diretos (link público) | Link direto público para assinatura sem envio por email (destinatário preenche dados ao assinar); limite por plano. | Média | Todos os usuários | `template-router` `createTemplateDirectLink`/`toggleTemplateDirectLink`, `create-document-from-direct-template.ts`, `get-template-by-direct-link-token.ts`, rota `embed+/_v0+/direct.$token.tsx`, `direct-template-*` |
| Envio em massa via CSV | Envio de um template para múltiplos destinatários a partir de CSV (job `internal.bulk-send-template`, até 4MB). | Baixa | Times | `template-router` `uploadBulkSend`, `packages/lib/jobs/definitions/internal/bulk-send-template.ts`, template `bulk-send-complete.tsx` |
| Anexos de documento | Anexos adicionais ao documento (imagens/documentos) exibidos ao destinatário, com CRUD por item. | Média | Todos os usuários | `envelope-router` `attachment.*`, `document-router` `attachment.*`, modelo `EnvelopeAttachment`, `document-signing-attachments-popover.tsx` |
| Duplicar, redistribuir e reenviar | Duplicação de documentos/templates, redistribuição para novo destinatário e reenvio para assinatura. | Média | Todos os usuários | `document-router` (duplicate/redistribute), `envelope-router` (duplicate/redistribute), `resend-document.ts` |
| Pastas e organização | Pastas aninhadas para documentos e templates, com pinning, breadcrumbs, mover/excluir em massa. | Média | Todos os usuários | `packages/trpc/server/folder-router/router.ts`, `bulk-move-envelopes`, `bulk-delete-envelopes`, modelo `Folder`, `folder-grid.tsx` |
| Detecção de campos/destinatários com IA | Detecção automática de campos e destinatários a partir de imagens das páginas do PDF usando Google Vertex AI. | Média | Todos os usuários | `packages/lib/server-only/ai/envelope/detect-fields/` e `detect-recipients/`, flag `aiFeaturesEnabled` em `OrganisationGlobalSettings`/`TeamGlobalSettings` |
| Assinatura com geolocalização | Captura de geolocalização (com reverse geocode) no ato da assinatura, controlável por documento. | Média | Todos os usuários | `geolocationEnabled` em `Envelope`, `document-signing-geolocation.ts`, `reverse-geocode.ts` |
| Editor legado V1 | Editor antigo de documento/campos ainda suportado (flag `useLegacyFieldInsertion`/`allowLegacyEnvelopes`). | Baixa | Usuários de envelopes legados | `t.$teamUrl/documents.$id.legacy_editor.tsx`, `templates.$id.legacy_editor.tsx`, `document-edit-form.tsx`, `template-edit-form.tsx` |

---

## Dashboard e relatórios

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Dashboard com estatísticas | Cards de contagem: documentos total/pendentes/completos/rascunho, templates e times do time atual. | Alta | Todos os usuários | `packages/trpc/server/dashboard-router/get-stats.ts`, `packages/lib/server-only/dashboard/get-dashboard-stats.ts`, `_authenticated+/dashboard.tsx` |
| Insights administrativos | Visão detalhada por organização: assinaturas, usuários, uso de recursos (admin). | Média | Admins de plataforma | `packages/lib/server-only/admin/get-organisation-detailed-insights.ts`, `admin+/organisation-insights.*` |
| Estatísticas da plataforma | Total de usuários, documentos, conversão de signatários, MAU, organizações com assinatura, crescimento mensal. | Média | Admins de plataforma | `admin+/stats.tsx`, `get-users-stats.ts`, `get-documents-stats.ts`, `get-signer-conversion.ts` |

---

## Integrações

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| API pública REST v1 | API REST legada (ts-rest) para documentos, campos, destinatários, templates e download (deprecated, mantida por compatibilidade). | Alta | Desenvolvedores | `packages/api/v1/contract.ts`, `implementation.ts`, `middleware/authenticated.ts`, exemplos em `v1/examples/` |
| API v2 (tRPC → OpenAPI) | API v2 com schema OpenAPI gerado a partir dos routers tRPC, autenticação por API key no header `Authorization`. | Alta | Desenvolvedores | `packages/trpc/server/open-api.ts` (rota base `/api/v2`), `trpc.ts` (middleware `authenticated` com API key), spec `docs/bchatsignapi.json` |
| API tokens | Criação, listagem e exclusão de tokens de API por time, com expiração opcional. | Alta | Desenvolvedores | `packages/trpc/server/api-token-router/router.ts`, `t.$teamUrl/settings.tokens.tsx`, modelo `ApiToken` |
| Webhooks | Webhooks por time com 13 eventos (documento criado/enviado/aberto/assinado/completado/rejeitado/cancelado, template criado/atualizado/deletado/usado, etc.), secret, histórico de chamadas e reenvio. | Alta | Desenvolvedores | `packages/trpc/server/webhook-router/router.ts`, `webhooks/trigger/trigger-webhook.ts`, `execute-webhook.ts` (job), `settings.webhooks.*`, enums `WebhookTriggerEvents`, `WebhookCall` |
| Embed authoring | Editor de criação/edição de documentos, templates e envelopes embutido em sites externos (iFrame), com tokens pré-assinados (presign) e opção white-label. | Média | Organizações Enterprise | Rotas `embed+/v1+/authoring+` e `embed+/v2+/authoring+`, `packages/trpc/server/embedding-router/_router.ts` (createEmbeddingPresignToken, create/update embedding document/template/envelope), `components/embed/authoring/` |
| Embed signing / multi-sign | Assinatura de documentos embutida em sites externos e lista de múltiplos documentos para assinar de uma vez. | Média | Organizações Enterprise | Rotas `embed+/_v0+/sign.$token.tsx` e `embed+/v1+/multisign+/`, `MultiSignDocumentList`, `embed-document-signing-page-v2.tsx` |
| Integração de email | Envio transacional via SMTP, Resend ou MailChannels (nodemailer), com templates em React (react-email) e i18n. | Alta | Todos os usuários | `packages/email/mailer.ts`, `transports/mailchannels.ts`, `packages/email/templates/` (28 templates), `packages/email/providers/` |
| Envio de email em nome da organização | Domínios de email verificados (DKIM) e remetentes customizados por organização, usados nos envios de documento. | Média | Organizações Enterprise | `enterprise-router` `organisation.email*`/`emailDomain.*`, modelos `EmailDomain`, `OrganisationEmail`, `settings.email.tsx`, `settings.email-domains.*` |

---

## Planos, assinatura e pagamentos

> Módulo comercial sob licença Enterprise (EE): `packages/ee/FEATURES` lista "Stripe Billing Module", "Email domains", "Authentication Portal", entre outros.

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Planos e assinatura Stripe | Listagem de planos, criação/consulta de assinatura, portal de billing (Stripe Customer Portal) e lista de faturas por organização. | Alta | Organizações pagantes | `enterprise-router` `billing.*`, `o.$orgUrl.settings.billing.tsx`, `packages/lib/server-only/stripe/index.ts`, rota `api+/stripe.webhook.ts` |
| Claims de recursos e limites | `SubscriptionClaim`/`OrganisationClaim` definem limites (times, membros, itens, destinatários), quotas e rate limits por janela, além de flags de funcionalidades (branding, embed, CFR 21, HIPAA, etc.). | Alta | Admins de plataforma | `packages/lib/types/subscription.ts`, modelos `SubscriptionClaim`, `OrganisationClaim`, `OrganisationMonthlyStat` em `schema.prisma`, `packages/ee/server-only/limits/` |
| Limites por plano | Plano free: 5 documentos, 10 destinatários, 3 templates diretos; pagos/self-hosted: ilimitados. | Alta | Todos os usuários | `packages/ee/server-only/limits/constants.ts` (FREE_PLAN_LIMITS, PAID_PLAN_LIMITS), `getServerLimits` usado em `use-envelope.ts` e `template-router` |
| Administração de billing | Admin pode criar cliente Stripe, trocar/sincronizar assinatura de organização, criar/editar/excluir claims. | Média | Admins de plataforma | `admin-router` `stripe.createCustomer`, `organisation.subscription.swap/sync`, `claims.*` |

---

## Administração

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Gestão de usuários | Admin cria/edita/exclui usuários, habilita/desabilita contas, reseta 2FA e vê times do usuário. | Alta | Admins de plataforma | `admin-router` `user.*`, páginas `admin+/users.*`, `disable-user.ts`, `enable-user.ts`, `reset-two-factor-authentication.ts` |
| Gestão de organizações e times | Admin visualiza/edita organizações e times, promove membro a owner, atualiza papéis e exclui membros. | Alta | Admins de plataforma | `admin-router` `organisation.*`, `team.get`, `organisationMember.*`, páginas `admin+/organisations.*`, `teams.$id.tsx` |
| Gestão de documentos | Admin busca documentos (inclusive não selados), exclui, re-sela, vê jobs de processamento e audit logs com download. | Alta | Admins de plataforma | `admin-router` `document.*`, páginas `admin+/documents.*`, `unsealed-documents._index.tsx`, `reseal-document.ts` |
| Site settings | Configurações globais do site: banner, blocklist de domínios de email e telemetria (booleano de habilitação + dados JSON). | Média | Admins de plataforma | `admin-router` `updateSiteSetting`, `packages/lib/server-only/site-settings/schemas/` (banner, email-blocklist, telemetry), `admin+/site-settings.tsx` |
| Licença Enterprise | Re-sincronização de licença EE e verificação de features licenciadas. | Baixa | Admins de plataforma | `admin-router` `license.resync`, `packages/lib/server-only/license/license-client.ts`, `packages/ee/FEATURES` |

---

## Configurações

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Configurações da organização | Central de configurações: geral, membros, times, grupos, documento, email, domínios de email, branding, billing e SSO. | Alta | Admins de organização | Rotas `o.$orgUrl.settings.*` (general, members, teams, groups, document, email, email-domains, branding, billing, sso, support), `update-organisation-settings.ts` |
| Configurações do time | Configurações por time: documento, email, branding, membros, grupos, perfil público, tokens de API e webhooks. | Alta | Admins de time | Rotas `t.$teamUrl/settings.*`, `update-team-settings.ts`, `TeamGlobalSettings` |
| Configurações pessoais | Perfil, avatar, senha, segurança (2FA, passkeys, sessões, atividade, contas vinculadas), billing pessoal e organizações. | Alta | Todos os usuários | Rotas `_authenticated+/settings+/*`, `profile-router` (updateProfile, setProfileImage, deleteAccount) |
| Configurações de documento/assinatura | Preferências de envio: idioma, timezone, formato de data, tipos de assinatura habilitados (digitada/upload/desenho), destinatários padrão, expiração e lembretes, detalhes do remetente, certificado e audit log. | Alta | Todos os usuários | `OrganisationGlobalSettings` e `TeamGlobalSettings` em `schema.prisma`, `o.$orgUrl.settings.document.tsx`, `t.$teamUrl/settings.document.tsx` |
| Branding customizado | Logo, cores (CSS vars), CSS custom e dados da empresa aplicados na página de assinatura do destinatário; opção white-label. | Média | Organizações pagantes | Campos `branding*` em `OrganisationGlobalSettings`, `load-recipient-branding.ts`, `recipient-branding.tsx`, rotas `api+/branding.logo.*` |
| Domínios de email e remetentes | Registro/verificação de domínio (chaves DKIM), re-registro e gerenciamento de emails remetentes da organização. | Média | Organizações Enterprise | `enterprise-router` `emailDomain.*`/`email.*`, `o.$orgUrl.settings.email-domains.*`, `reregister-email-domain.ts` |

---

## Segurança e permissões

| Funcionalidade | Descrição | Relevância | Usuário beneficiado | Evidências no projeto |
| -------------- | --------- | ---------- | ------------------- | --------------------- |
| Autenticação de acesso e ação em documentos | Recipient precisa autenticar para acessar e/ou assinar: conta, passkey, 2FA (email/autenticador) ou senha; reautenticação para ações. | Alta | Todos os usuários | `packages/lib/types/document-auth.ts` (DocumentAuth: ACCOUNT, PASSKEY, TWO_FACTOR_AUTH, PASSWORD, EXPLICIT_NONE), `document-signing-auth-*`, `sign-field-with-token.ts`, `validate-field-auth.ts` |
| 2FA por email no acesso a documento | Solicitação de código 2FA por email para acessar documento protegido. | Alta | Todos os usuários | `document-router` `accessAuth.request2FAEmail`, `packages/lib/server-only/2fa/email/`, template `access-auth-2fa.tsx` |
| Visibilidade de documentos e pastas | Controle de quem vê: EVERYONE, MANAGER_AND_ABOVE ou ADMIN (por documento, pasta e padrão da organização). | Média | Organizações e times | Enum `DocumentVisibility` em `schema.prisma`, campos em `Envelope`, `Folder`, `OrganisationGlobalSettings` |
| Rate limiting | Rate limits por ação com janelas configuráveis (ex.: `5m`, `1h`, `1d`) para documentos, emails e API, com cleanup automático. | Média | Todos os usuários (proteção) | `packages/lib/server-only/rate-limit/`, modelo `RateLimit`, job `cleanup-rate-limits`, `SubscriptionClaim.documentRateLimits/emailRateLimits/apiRateLimits` |
| Portal de autenticação da organização (SSO OIDC) | Login SSO da organização via OIDC com clientId/secret, auto-provisionamento, domínios permitidos e papel padrão; link de conta. | Média | Organizações Enterprise | `enterprise-router` `organisation.authenticationPortal.*`, `o.$orgUrl.settings.sso.tsx`, `o.$orgUrl.signin.tsx`, modelo `OrganisationAuthenticationPortal` |
| Captcha no registro | Verificação de captcha no cadastro para evitar abuso. | Média | Todos os usuários (proteção) | `packages/lib/server-only/captcha/verify-captcha.ts`, usado em `packages/auth/server/routes/email-password.ts` |
| Desabilitação de contas | Contas desabilitadas não podem enviar documentos (verificação em send/distribute/bulk/direct). | Média | Admins de plataforma | `disable-user.ts`/`enable-user.ts` (admin), `assert-user-not-disabled.ts` usado em `send-document.ts` |
| Proteção de URLs privadas em webhooks | Bloqueio de webhooks para IPs privados (SSRF) e validação de URL. | Média | Desenvolvedores | `packages/lib/server-only/webhooks/is-private-url.ts`, `assert-webhook-url.ts` |
| Criptografia de dados sensíveis | Criptografia/descriptografia de dados (ex.: credenciais de domínios) em repouso. | Média | Todos os usuários | `packages/lib/server-only/crypto/`, uso em `certificate.tsx`/`audit-log.tsx` (`decryptSecondaryData`) |

---

## Observações

### Funcionalidades incompletas ou parcialmente implementadas
- **Envio em massa via CSV** (`uploadBulkSend`) existe na API e no job, mas não foi encontrada página de UI dedicada — o job `bulk-send-template` está implementado e dispara email de conclusão (`bulk-send-complete.tsx`).
- **Editor legado V1** continua suportado lado a lado com o editor V2 (rotas `legacy_editor.tsx`); a migração depende da flag `useLegacyFieldInsertion`/claim `allowLegacyEnvelopes`.
- **Detecção de IA** (`detect-fields`/`detect-recipients`) está implementada no servidor (Vertex AI) e atrás da flag `aiFeaturesEnabled`, mas não foi confirmado se a UI do editor V2 já expõe o fluxo completo de ponta a ponta.
- **Multi-sign (embed)**: `applyMultiSignSignature` está comentado em `embedding-router/_router.ts` — a capacidade de assinar múltiplos documentos embutidos existe via rota `embed+/v1+/multisign+/`, mas uma parte da API permanece desativada.
- **Relatório ITI**: upload/extração/validação implementados; a integração com selagem automática depende de fluxo externo (campos `itiReport*` em `EnvelopeItem`).

### Funcionalidades no código, mas aparentemente não expostas na interface
- **`webhook.trigger.ts`** (rota `api+/`) tem TODO explícito: *"delete file after deployment"* — endpoint temporário de trigger manual de webhooks.
- **Embed authoring/embed signing** possuem UI própria (`embed+`, `playground.tsx`), mas são consumidos via integração externa (tokens presign) — sem tela no app principal.
- **`downloadDocumentBeta` / `createDocumentTemporary` / `createTemplateTemporary`** marcados como deprecated no router — substituídos pelo fluxo V2.
- **API REST v1** inteira está marcada como deprecated no contrato ts-rest, mantida por compatibilidade.
- **Avatar de organização/team/user** via `setProfileImage` existe na API e em telas de configuração; **avatar público** tem rotas de serviço (`api+/avatar.$id.tsx`).
- **`openpage-api`** (`apps/openpage-api`) expõe estatísticas de comunidade/GitHub (stars, forks, PRs, crescimento) — é um serviço auxiliar de marketing, não uma funcionalidade do produto de assinatura.

### Áreas cuja finalidade não pôde ser determinada com segurança
- **`embed+/v1+/multisign+/` vs `embedding-router`**: a relação entre a rota multi-sign e os procedimentos `getMultiSignDocument`/`applyMultiSignSignature` está parcialmente implementada (um procedimento comentado), sem evidência de uso em produção.
- **`SiteSettings` com `telemetry`**: existe schema e endpoint de leitura, mas não foi encontrado consumidor ativo da telemetria no frontend.
- **Campos de certificado `sealingCertificate*` e validações `icpBrasilChainValidationStatus`/`pdfSignatureValidationStatus`**: persistidos e exibidos no painel de validação do documento (`document-validation-panel.tsx`), porém o fluxo de validação externa (ex.: validação ICP-Brasil em serviço terceiro) não está claro apenas pelo código.
