import { extractPostHogConfig } from '@documenso/lib/constants/feature-flags';
import { APP_I18N_OPTIONS } from '@documenso/lib/constants/i18n';
import { dynamicActivate } from '@documenso/lib/utils/i18n';
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
    );
  });

  initPosthog();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
