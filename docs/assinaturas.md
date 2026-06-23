# Planos de assinatura — recursos e limites

> Documento gerado a partir do código em 2026-06-09. Fonte:
> [`packages/lib/types/subscription.ts`](../packages/lib/types/subscription.ts) e
> [`packages/prisma/schema.prisma`](../packages/prisma/schema.prisma).

## Como funciona (modelo de dados)

O Stripe é a fonte de verdade dos preços/planos comerciais. No banco, três tabelas
modelam a assinatura e os recursos:

| Tabela | Papel |
| --- | --- |
| **`Subscription`** ([schema.prisma:241](../packages/prisma/schema.prisma#L241)) | Liga a organização ao plano/preço do Stripe (`planId`, `priceId`, `customerId`, `status`, `periodEnd`). Não guarda recursos. |
| **`SubscriptionClaim`** ([schema.prisma:260](../packages/prisma/schema.prisma#L260)) | "Template" de plano: define limites, `flags` (recursos), quotas e rate limits. |
| **`OrganisationClaim`** ([schema.prisma:286](../packages/prisma/schema.prisma#L286)) | Snapshot dos recursos aplicados a uma organização (1:1). É o que o app lê em runtime. Aponta para o claim de origem via `originalSubscriptionClaimId`. |

> ⚠️ **Atenção (fonte de verdade):** o código tem um `TODO` explícito
> ([subscription.ts:142](../packages/lib/types/subscription.ts#L142)) avisando que **apenas
> o plano `free` é usado diretamente do código**. Para os demais planos, somente `id`/`name`
> são garantidos; **flags, limites e quotas reais são lidos do `SubscriptionClaim` no banco**
> (configurados via Stripe/admin). Os valores abaixo são os defaults/legados embutidos em
> `internalClaims` — úteis como referência, mas podem divergir do que está no banco em produção.

## Planos internos (`INTERNAL_CLAIM_ID`)

São 6 planos embutidos ([subscription.ts:127](../packages/lib/types/subscription.ts#L127)):

| Plano (`name`) | `id` | `locked` |
| --- | --- | --- |
| Free | `free` | sim |
| Individual | `individual` | sim |
| Teams | `team` | sim |
| Platform | `platform` | sim |
| Enterprise | `enterprise` | sim |
| Early Adopter | `earlyAdopter` | sim |

## Limites por plano

Convenção: **`0` = ilimitado** (ver guarda `teamCount !== 0` em
[create-team.ts:78](../packages/lib/server-only/team/create-team.ts#L78) e comentários
"recipientCount of 0 means unlimited"). Abaixo `0` está representado como **∞**.

| Plano | Times (`teamCount`) | Membros (`memberCount`) | Itens por envelope (`envelopeItemCount`) | Destinatários (`recipientCount`) |
| --- | :---: | :---: | :---: | :---: |
| **Free** | 1 | 1 | 5 | ∞ |
| **Individual** | 1 | 1 | 5 | ∞ |
| **Teams** | 1 | 5 | 5 | ∞ |
| **Platform** | 1 | ∞ | 10 | ∞ |
| **Enterprise** | ∞ | ∞ | 10 | ∞ |
| **Early Adopter** | ∞ | ∞ | 5 | ∞ |

## Recursos por plano (`flags`)

Legenda: ✅ habilitado · ❌ explicitamente desabilitado no código · — não definido (= desabilitado).

| Recurso (`flag`) | Free | Individual | Teams | Platform | Enterprise | Early Adopter |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `unlimitedDocuments` | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| `allowCustomBranding` | — | — | ✅ | ✅ | ✅ | ✅ |
| `hidePoweredBy` | — | — | — | ✅ | ✅ | ✅ |
| `emailDomains` | — | — | — | ❌ | ✅ | — |
| `embedAuthoring` | — | — | — | ❌ | ✅ | — |
| `embedAuthoringWhiteLabel` | — | — | — | ✅ | ✅ | — |
| `embedSigning` | — | — | ✅ | ❌ | ✅ | ✅ |
| `embedSigningWhiteLabel` | — | — | — | ✅ | ✅ | ✅ |
| `cfr21` | — | — | — | — | ✅ | — |
| `hipaa` | — | — | — | — | — | — |
| `authenticationPortal` | — | — | — | — | ✅ | — |
| `allowLegacyEnvelopes` | — | — | — | — | — | — |
| `signingReminders` | — | ✅ | ✅ | ✅ | ✅ | ✅ |

> Nota: `hipaa` e `allowLegacyEnvelopes` não estão habilitados em nenhum plano interno —
> só podem ser ativados via `SubscriptionClaim` no banco (admin/Stripe).

## Quotas e rate limits

Em **todos** os planos internos os campos de quota e rate limit estão vazios/nulos no código:

| Campo | Valor (todos os planos internos) |
| --- | --- |
| `documentQuota` | `null` (sem limite) |
| `documentRateLimits` | `[]` |
| `emailQuota` | `null` (sem limite) |
| `emailRateLimits` | `[]` |
| `apiQuota` | `null` (sem limite) |
| `apiRateLimits` | `[]` |

> Os valores reais de quota/rate limit dos planos pagos vêm do `SubscriptionClaim` no banco,
> não deste arquivo. Formato de rate limit: array de `{ window, max }`, onde `window` segue
> o padrão `\d+[smhd]` (ex.: `"5m"`, `"1h"`, `"1d"`) — ver `ZRateLimitArraySchema`
> ([subscription.ts:12](../packages/lib/types/subscription.ts#L12)).

## Catálogo de recursos (flags)

Definidos em `ZClaimFlagsSchema` ([subscription.ts:25](../packages/lib/types/subscription.ts#L25))
e rotulados em `SUBSCRIPTION_CLAIM_FEATURE_FLAGS` ([subscription.ts:59](../packages/lib/types/subscription.ts#L59)).

| `flag` | Label | Enterprise? | Descrição |
| --- | --- | :---: | --- |
| `unlimitedDocuments` | Unlimited documents | | Remove o limite de documentos. |
| `allowCustomBranding` | Branding | | Branding customizado (certificados, e-mails). |
| `hidePoweredBy` | Hide Bchatsign branding | | Oculta a marca "Powered by Bchatsign". |
| `emailDomains` | Email domains | ✅ | Domínios de e-mail próprios. |
| `embedAuthoring` | Embed authoring | ✅ | Autoria de documentos via embed. |
| `embedAuthoringWhiteLabel` | White label for embed authoring | ✅ | White label na autoria via embed. |
| `embedSigning` | Embed signing | | Assinatura via embed. |
| `embedSigningWhiteLabel` | White label for embed signing | | White label na assinatura via embed. |
| `cfr21` | 21 CFR | ✅ | Conformidade 21 CFR Part 11. |
| `hipaa` | HIPAA | ✅ | Conformidade HIPAA. |
| `authenticationPortal` | Authentication portal | ✅ | Portal de autenticação. |
| `allowLegacyEnvelopes` | Allow Legacy Envelopes | | Permite envelopes legados. |
| `signingReminders` | Signing reminders | | Lembretes de assinatura. |

## Claim padrão (default)

Para organizações sem plano definido (ex.: self-hosted), o claim default
([organisations-claims.ts](../packages/lib/utils/organisations-claims.ts)) usa:

| Campo | Valor |
| --- | --- |
| `teamCount` | 1 |
| `memberCount` | 1 |
| `envelopeItemCount` | 5 (`DEFAULT_MINIMUM_ENVELOPE_ITEM_COUNT`) |
| `recipientCount` | 20 (`DEFAULT_RECIPIENT_COUNT`) |
| `flags` | `{}` |
| quotas / rate limits | `null` / `[]` |

## Referências

- Tipos e planos internos: [`packages/lib/types/subscription.ts`](../packages/lib/types/subscription.ts)
- Schema do banco: [`packages/prisma/schema.prisma`](../packages/prisma/schema.prisma)
- Constantes default: [`packages/ee/server-only/limits/constants.ts`](../packages/ee/server-only/limits/constants.ts)
- Aplicação de limites: [`packages/lib/server-only/team/create-team.ts`](../packages/lib/server-only/team/create-team.ts)
