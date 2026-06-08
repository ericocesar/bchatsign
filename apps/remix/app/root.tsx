import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { SessionProvider } from '@documenso/lib/client-only/providers/session';
import { APP_I18N_OPTIONS, type SupportedLanguageCodes } from '@documenso/lib/constants/i18n';
import { createPublicEnv } from '@documenso/lib/utils/env';
import { extractLocaleData } from '@documenso/lib/utils/i18n';
import { TrpcProvider } from '@documenso/trpc/react';
import { getOrganisationSession } from '@documenso/trpc/server/organisation-router/get-organisation-session';
import { Toaster } from '@documenso/ui/primitives/toaster';
import { TooltipProvider } from '@documenso/ui/primitives/tooltip';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
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

import type { Route } from './+types/root';
import stylesheet from './app.css?url';
import { GenericErrorLayout } from './components/general/generic-error-layout';
import { langCookie } from './storage/lang-cookie.server';
import { themeSessionResolver } from './storage/theme-session.server';
import { appMetaTags } from './utils/meta';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500&display=swap',
  },
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest' },
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

  let lang: SupportedLanguageCodes = await langCookie.parse(cookieHeader);

  if (!APP_I18N_OPTIONS.supportedLangs.includes(lang)) {
    lang = extractLocaleData({ headers: request.headers }).lang;
  }

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
      // Surface the per-request CSP nonce produced by `securityHeadersMiddleware` so all
      // SSR-rendered <script>/<style> elements in this layout (and child
      // routes that need it) can carry the matching nonce attribute.
      nonce: context.nonce,
      session: session.isAuthenticated
        ? {
            user: session.user,
            session: session.session,
            organisations: organisations || [],
          }
        : null,
      publicEnv: createPublicEnv(),
    },
    {
      headers: {
        'Set-Cookie': await langCookie.serialize(lang),
      },
    },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useLoaderData<typeof loader>() || {};

  return (
    <ThemeProvider specifiedTheme={theme} themeAction="/api/theme">
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  );
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { publicEnv, session, lang, disableAnimations, nonce: cspNonce } = useLoaderData<typeof loader>() || {};

  const [theme] = useTheme();

  // Recipient routes (signing pages) put `documenso-branded` on <body> so the
  // <style> block from `RecipientBranding` applies to BOTH the main tree and
  // any portaled content (Radix dialogs/popovers/dropdowns mount outside the
  // route tree, attached directly to document.body).
  const matches = useMatches();
  const isRecipientRoute = matches.some((m) => m.id?.startsWith('routes/_recipient+'));

  return (
    <html translate="no" lang={lang} data-theme={theme} className={theme ?? ''} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
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
      <body className={isRecipientRoute ? 'documenso-branded' : undefined}>
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
            __html: `window.__ENV__ = ${JSON.stringify(publicEnv)}`,
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
  const errorCode = isRouteErrorResponse(error) ? error.status : 500;

  if (errorCode !== 404) {
    console.error('[RootErrorBoundary]', error);
  }

  return <GenericErrorLayout errorCode={errorCode} />;
}
