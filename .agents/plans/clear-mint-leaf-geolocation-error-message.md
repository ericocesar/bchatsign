---
date: 2026-06-05
title: Geolocation signing error message refinement
---

## Summary

When a signer hits the "Assinar" button in dev (and any environment where the browser cannot determine position), the signing flow surfaces a generic `POSITION_UNAVAILABLE` error: *"Não foi possível determinar sua localização neste dispositivo. Ative os serviços de localização do sistema e do navegador e tente novamente."* The message is correct in spirit but conflates three distinct failure modes that the user can actually fix, and the underlying `requestGeolocation` function never inspects `window.isSecureContext`, so an insecure origin (HTTP non-localhost) presents as a missing-location problem instead of a transport problem.

The fix refines the error mapping so the user gets an actionable message keyed to the actual cause, and adds a preflight `isSecureContext` guard so an HTTP origin fails fast with a precise message instead of consuming the 30s high-accuracy timeout. Behaviour is otherwise unchanged: when `geolocationEnabled === true` for a SIGNER, signing is still blocked on geolocation failure (this matches the per-document setting the issuer chose).

This is a real-world manifestation of risk `Geolocalização indisponível (navegador nega, política corporativa)` already called out in `.context/plans/certificate-overlay-security.md` § Risk Assessment. Mitigation there is "tratar como dado opcional com fallback explícito, nunca bloquear assinatura" — that mitigation is **not** in scope here because it would silently violate `geolocationEnabled=true`, which is the issuer's explicit contract. This plan only sharpens the error.

## Root cause

`apps/remix/app/components/general/document-signing/document-signing-complete-dialog.tsx:112-147` — `requestGeolocation` only checks `typeof navigator === 'undefined' || !navigator.geolocation`. It does not check `window.isSecureContext`, so the function proceeds to `resolveGeolocation(navigator)` and the browser returns `POSITION_UNAVAILABLE` (code 2) on insecure origins instead of a `SecurityError` we could distinguish.

`apps/remix/app/components/general/document-signing/document-signing-geolocation.ts:71-93` — `getGeolocationErrorMessage` only knows three codes (`PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`). Any error without a numeric `code` (typical for `SecurityError` from some browsers, or thrown synchronously before the callback runs) falls through to the generic "Verifique a permissão do navegador e tente novamente" message, which is correct for permission but wrong for everything else.

## Behaviour changes

| Trigger | Old message | New message |
|---|---|---|
| `window.isSecureContext === false` | (no preflight, hits POSITION_UNAVAILABLE) | "Esta página não está em um contexto seguro (HTTPS). Acesse via HTTPS ou `localhost` para permitir a geolocalização." |
| `POSITION_UNAVAILABLE` | "Não foi possível determinar sua localização neste dispositivo. Ative os serviços de localização do sistema e do navegador e tente novamente." | "Não foi possível determinar sua localização. Confirme que os serviços de localização do sistema estão ativados e que o navegador tem permissão de localização para este site, depois tente novamente." |
| Error thrown without `code` (SecurityError, etc.) | Generic fallback | "A geolocalização não pôde ser solicitada neste navegador. Verifique se a página está em HTTPS e se o navegador permite geolocalização." |
| `PERMISSION_DENIED` | unchanged | unchanged |
| `TIMEOUT` | unchanged | unchanged |

PT-BR is the default locale (per `AGENTS.md` and the existing message style). No i18n macro wrapping — matches the surrounding code which keeps the error strings inline for the same reason.

## Files

- `apps/remix/app/components/general/document-signing/document-signing-geolocation.ts` — add `isSecureContext` parameter to `getGeolocationErrorMessage`, add a branch for errors without a recognised `code`, soften `POSITION_UNAVAILABLE` wording to be more actionable.
- `apps/remix/app/components/general/document-signing/document-signing-complete-dialog.tsx` — add the `isSecureContext` preflight in `requestGeolocation` and pass the result through to `getGeolocationErrorMessage`.
- `apps/remix/app/components/general/document-signing/document-signing-geolocation.test.ts` — add coverage for the new branches (secure-context rejection, error without code, secure-context flag plumbed through to the message).

## Out of scope

- Making geolocation optional when `geolocationEnabled === true`. That is a product decision the issuer controls, and silently signing without the data they asked for would be worse than a clear error.
- Changing the high-accuracy/fallback options (`enableHighAccuracy`, `timeout`, `maximumAge`).
- Touching the `certificate-overlay-security` plan — this fix is independent and small enough to ship without re-planning that larger body of work.

## Verification

- `npx vitest run apps/remix/app/components/general/document-signing/document-signing-geolocation.test.ts` — all four cases pass (existing three + new secure-context case).
- `npx tsc --noEmit` in `apps/remix` — no type errors.
- Manual: open `http://localhost:3000` in a browser with system location services off, click "Assinar", confirm the new actionable message appears; turn location on, retry, confirm signing proceeds.
