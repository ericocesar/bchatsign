import { extractPostHogConfig } from '@bchatsign/lib/constants/feature-flags';
import { APP_I18N_OPTIONS } from '@bchatsign/lib/constants/i18n';
import { dynamicActivate } from '@bchatsign/lib/utils/i18n';
import { i18n } from '@lingui/core';
import { detect, fromHtmlTag } from '@lingui/detect-locale';
import { I18nProvider } from '@lingui/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

import './utils/polyfills/promise-with-resolvers';

/**
 * Read the per-request CSP nonce rendered by root.tsx so third-party libs that
 * inject <style> at runtime (react-style-singleton, used by
 * react-remove-scroll / Radix Dialog body-scroll lock) can stamp the matching
 * nonce attribute on the <style> tag they create via `getNonce()`.
 *
 * Browsers strip the nonce from the DOM after CSP processing, so we copy it
 * into `window.__webpack_nonce__` immediately. Must run before any
 * effect-mounted style-injection (i.e. before the first render that mounts a
 * Radix Dialog/Popover/AlertDialog).
 */
const readCspNonce = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]');
  const nonce = meta?.getAttribute('content') ?? undefined;

  if (nonce) {
    // `get-nonce` (transitive dep of react-style-singleton) reads from
    // `__webpack_nonce__` when no module-level nonce has been set.
    // The leading-underscore name is webpack's CSP convention; non-webpack
    // runtimes that read it (like Vite's dev SSR) also pick it up.
    (window as unknown as { __webpack_nonce__?: string }).__webpack_nonce__ = nonce;
  }
};

/**
 * Initialised imperatively (not as a component inside `hydrateRoot`) because
 * rendering extra client-only siblings changes the React tree structure
 * relative to the server render in `entry.server.tsx`. That shifts every
 * `useId` value (used by Radix for `id`/`htmlFor`/`aria-*`), causing hydration
 * mismatches which can abort hydration entirely when the user interacts with
 * the page early, leaving dead event handlers (broken dropdowns, native form
 * submits).
 */
function initPosthog() {
  const postHogConfig = extractPostHogConfig();

  if (!postHogConfig) {
    return;
  }

  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(postHogConfig.key, {
      api_host: postHogConfig.host,
      capture_exceptions: true,
    });
  });
}

/**
 * Surfaces hydration recoveries (React 19 discards the server HTML and
 * re-renders on the client instead of dying) so we can track how often
 * extensions/early clicks interfere with hydration in the wild.
 */
function onRecoverableError(error: unknown, errorInfo: { componentStack?: string }) {
  console.error('[hydration] recovered from error', error, errorInfo.componentStack);

  if (extractPostHogConfig()) {
    void import('posthog-js').then(({ default: posthog }) => {
      if (posthog.__loaded) {
        posthog.capture('$hydration_recoverable_error', {
          message: error instanceof Error ? error.message : String(error),
          componentStack: errorInfo.componentStack,
        });
      }
    });
  }
}

async function main() {
  const locale = detect(fromHtmlTag('lang')) || APP_I18N_OPTIONS.defaultLocale;

  await dynamicActivate(locale);

  readCspNonce();

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nProvider i18n={i18n}>
        <HydratedRouter />
      </I18nProvider>,
      { onRecoverableError },
    );
  });

  initPosthog();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
