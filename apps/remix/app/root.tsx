import { getOptionalSession } from '@bchatsign/auth/server/lib/utils/get-session';
import { useAnalytics } from '@bchatsign/lib/client-only/hooks/use-analytics';
import { SessionProvider } from '@bchatsign/lib/client-only/providers/session';
import { getBasePath } from '@bchatsign/lib/constants/app';
import { APP_I18N_OPTIONS, type SupportedLanguageCodes } from '@bchatsign/lib/constants/i18n';
import { createPublicEnv } from '@bchatsign/lib/utils/env';
import { extractLocaleData } from '@bchatsign/lib/utils/i18n';
import { TrpcProvider } from '@bchatsign/trpc/react';
import { getOrganisationSession } from '@bchatsign/trpc/server/organisation-router/get-organisation-session';
import { Toaster } from '@bchatsign/ui/primitives/toaster';
import { TooltipProvider } from '@bchatsign/ui/primitives/tooltip';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { useEffect } from 'react';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from 'react-router';
import { ThemeProvider, useTheme } from 'remix-themes';
import { nonceMiddleware } from '~/middleware/nonce';

import type { Route } from './+types/root';
import stylesheet from './app.css?url';
import { GenericErrorLayout } from './components/general/generic-error-layout';
import { langCookie } from './storage/lang-cookie.server';
import { themeSessionResolver } from './storage/theme-session.server';
import { appMetaTags } from './utils/meta';
import { nonce, nonceContext } from './utils/nonce';

export const middleware = [nonceMiddleware];

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500&display=swap',
  },
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
];

export function meta() {
  return appMetaTags();
}

/**
 * Don't revalidate (run the loader on sequential navigations) on the root layout
 *
 * Update values via providers.
 */
export const shouldRevalidate = () => false;

export async function loader({ context, request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);

  const { getTheme } = await themeSessionResolver(request);

  const cookieHeader = request.headers.get('cookie') ?? '';

  // Only honour a language that was explicitly chosen and persisted via
  // /api/locale (the language switcher). For everyone else we resolve the
  // locale fresh on each request (defaults to pt-BR) instead of letting a
  // previously auto-written cookie pin the language for two years — which is
  // what kept showing a stale `en` after the default became pt-BR.
  const cookieLang: SupportedLanguageCodes = await langCookie.parse(cookieHeader);
  const hasExplicitLangChoice = APP_I18N_OPTIONS.supportedLangs.includes(cookieLang);

  const lang: SupportedLanguageCodes = hasExplicitLangChoice
    ? cookieLang
    : extractLocaleData({ headers: request.headers }).lang;

  const disableAnimations = cookieHeader.includes('__disable_animations=true');

  let organisations = null;

  if (session.isAuthenticated) {
    organisations = await getOrganisationSession({ userId: session.user.id });
  }

  return data(
    {
      lang,
      theme: getTheme(),
      disableAnimations,
      basePath: getBasePath(),
      // Surface the per-request CSP nonce produced by `securityHeadersMiddleware` so all
      // SSR-rendered <script>/<style> elements in this layout (and child
      // routes that need it) can carry the matching nonce attribute.
      nonce: context.get(nonceContext),
      session: session.isAuthenticated
        ? {
            user: session.user,
            session: session.session,
            organisations: organisations || [],
          }
        : null,
      publicEnv: createPublicEnv(),
    },
    // Only (re)write the cookie when the user has an explicit choice; never
    // auto-pin the detected/default locale, otherwise a first visit during an
    // older default would lock the language in for two years.
    hasExplicitLangChoice
      ? {
          headers: {
            'Set-Cookie': await langCookie.serialize(lang),
          },
        }
      : undefined,
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, basePath } = useLoaderData<typeof loader>() || {};

  return (
    <ThemeProvider specifiedTheme={theme} themeAction={`${basePath ?? ''}/api/theme`}>
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  );
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const {
    publicEnv,
    session,
    lang,
    disableAnimations,
    nonce: cspNonce,
    basePath,
  } = useLoaderData<typeof loader>() || {};

  const [theme] = useTheme();

  // Recipient routes (signing pages) put `bchatsign-branded` on <body> so the
  // <style> block from `RecipientBranding` applies to BOTH the main tree and
  // any portaled content (Radix dialogs/popovers/dropdowns mount outside the
  // route tree, attached directly to document.body).
  const matches = useMatches();
  const isRecipientRoute = matches.some((m) => m.id?.startsWith('routes/_recipient+'));

  return (
    // `suppressHydrationWarning` because `remix-themes` intentionally mutates
    // `data-theme`/`class` on <html> before hydration (PreventFlashOnWrongTheme),
    // so the server-rendered attributes never match the client render when the
    // theme is resolved from the system preference. Attribute-only, one level deep.
    <html
      translate="no"
      lang={lang ?? APP_I18N_OPTIONS.defaultLocale}
      data-theme={theme}
      className={theme ?? ''}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <link rel="apple-touch-icon" sizes="180x180" href={`${basePath ?? ''}/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`${basePath ?? ''}/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`${basePath ?? ''}/favicon-16x16.png`} />
        <link rel="manifest" href={`${basePath ?? ''}/site.webmanifest`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        {/* Per-request CSP nonce surfaced for the client entry to read before
            any third-party style-injection lib (react-style-singleton, used by
            react-remove-scroll / Radix Dialog body-scroll lock) calls
            getNonce() — keeps style-src-elem enforced without 'unsafe-inline'. */}
        {cspNonce && <meta name="csp-nonce" content={cspNonce} />}
        <Meta />
        <Links />

        {disableAnimations && (
          <style
            nonce={cspNonce}
            dangerouslySetInnerHTML={{
              __html: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
            }}
          />
        )}
      </head>
      <body className={isRecipientRoute ? 'bchatsign-branded' : undefined}>
        {/* Global license banner currently disabled. Need to wait until after a few releases. */}
        {/* {licenseStatus === '?' && (
          <div className="bg-destructive text-destructive-foreground">
            <div className="mx-auto flex h-auto max-w-screen-xl items-center justify-center px-4 py-3 text-sm font-medium">
              <div className="flex items-center">
                <AlertTriangleIcon className="mr-2 h-4 w-4" />
                <Trans>This is an expired license instance of BchatSign</Trans>
              </div>
            </div>
          </div>
        )} */}

        <NuqsAdapter>
          <TooltipProvider>
            <SessionProvider initialSession={session}>
              <TrpcProvider>
                {children}

                <Toaster />
              </TrpcProvider>
            </SessionProvider>
          </TooltipProvider>
        </NuqsAdapter>

        <script
          nonce={cspNonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            // `__webpack_nonce__` is read by `get-nonce` (used by
            // react-remove-scroll / react-style-singleton inside Radix menus and
            // dialogs) to stamp runtime-injected <style> elements. Without it the
            // strict `style-src-elem` CSP blocks the scroll-lock styles.
            __html: `window.__ENV__ = ${JSON.stringify(publicEnv)}; window.__webpack_nonce__ = ${JSON.stringify(cspNonce ?? '')}`,
          }}
        />

        <ScrollRestoration nonce={cspNonce} />
        <Scripts nonce={cspNonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const analytics = useAnalytics();

  const errorCode = isRouteErrorResponse(error) ? error.status : 500;

  if (errorCode !== 404) {
    console.error('[RootErrorBoundary]', error);
  }

  useEffect(() => {
    if (errorCode !== 404) {
      analytics.captureException(error, { source: 'app', location: 'root_boundary' });
    }
  }, [error]);

  return <GenericErrorLayout errorCode={errorCode} />;
}
