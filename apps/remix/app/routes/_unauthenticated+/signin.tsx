import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import {
  IS_GOOGLE_SSO_ENABLED,
  IS_MICROSOFT_SSO_ENABLED,
  IS_OIDC_SSO_ENABLED,
  isSignupEnabledForProvider,
  OIDC_PROVIDER_LABEL,
} from '@documenso/lib/constants/auth';
import { isValidReturnTo, normalizeReturnTo } from '@documenso/lib/utils/is-valid-return-to';
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, redirect, useSearchParams } from 'react-router';

import { SignInForm } from '~/components/forms/signin';
import { BrandHero } from '~/components/brand-hero';
import { SIGNUP_ERROR_MESSAGES } from '~/components/forms/signup';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/signin';

export function meta() {
  return appMetaTags(msg`Sign In`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const { isAuthenticated } = await getOptionalSession(request);

  // SSR env variables.
  const isGoogleSSOEnabled = IS_GOOGLE_SSO_ENABLED;
  const isMicrosoftSSOEnabled = IS_MICROSOFT_SSO_ENABLED;
  const isOIDCSSOEnabled = IS_OIDC_SSO_ENABLED;
  const oidcProviderLabel = OIDC_PROVIDER_LABEL;
  const isSignupEnabled =
    isSignupEnabledForProvider('email') ||
    (IS_GOOGLE_SSO_ENABLED && isSignupEnabledForProvider('google')) ||
    (IS_MICROSOFT_SSO_ENABLED && isSignupEnabledForProvider('microsoft')) ||
    (IS_OIDC_SSO_ENABLED && isSignupEnabledForProvider('oidc'));

  let returnTo = new URL(request.url).searchParams.get('returnTo') ?? undefined;

  returnTo = isValidReturnTo(returnTo) ? normalizeReturnTo(returnTo) : undefined;

  if (isAuthenticated) {
    throw redirect(returnTo || '/');
  }

  return {
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    isSignupEnabled,
    oidcProviderLabel,
    returnTo,
  };
}

const formContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const formItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const {
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    isSignupEnabled,
    oidcProviderLabel,
    returnTo,
  } = loaderData;

  const { _ } = useLingui();

  const [searchParams] = useSearchParams();
  const [isEmbeddedRedirect, setIsEmbeddedRedirect] = useState(false);

  const errorParam = searchParams.get('error');
  const signupError = errorParam ? SIGNUP_ERROR_MESSAGES[errorParam] : undefined;

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    setIsEmbeddedRedirect(params.get('embedded') === 'true');
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex h-dvh w-screen overflow-hidden bg-background">
      {/* Left side — hero/branding (hidden on mobile) */}
      <BrandHero />

      {/* Right side — form */}
      <div className="z-10 flex h-full w-full items-center justify-center overflow-y-auto px-4 lg:w-1/2 lg:px-12 xl:px-16">
        <motion.div
          className="w-full max-w-md space-y-6 py-8"
          variants={formContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo — visible only below lg breakpoint */}
          <motion.div variants={formItemVariants} className="lg:hidden">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10" />
              <span className="font-bold text-lg">BchatSign</span>
            </div>
          </motion.div>

          {/* Glassmorphism card */}
          <motion.div
            variants={formItemVariants}
            className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-lg backdrop-blur-xl dark:border-border/30 dark:bg-card/60"
          >
            {signupError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{_(signupError)}</AlertDescription>
              </Alert>
            )}

            <motion.h1
              variants={formItemVariants}
              className="font-semibold text-2xl"
            >
              <Trans>Sign in to your account</Trans>
            </motion.h1>

            <motion.p
              variants={formItemVariants}
              className="mt-2 text-muted-foreground text-sm"
            >
              <Trans>Welcome back, we are lucky to have you.</Trans>
            </motion.p>

            <hr className="-mx-8 my-4 border-border/50" />

            <SignInForm
              isGoogleSSOEnabled={isGoogleSSOEnabled}
              isMicrosoftSSOEnabled={isMicrosoftSSOEnabled}
              isOIDCSSOEnabled={isOIDCSSOEnabled}
              oidcProviderLabel={oidcProviderLabel}
              returnTo={returnTo}
            />

            {!isEmbeddedRedirect && isSignupEnabled && (
              <motion.p
                variants={formItemVariants}
                className="mt-6 text-center text-muted-foreground text-sm"
              >
                <Trans>
                  Don't have an account?{' '}
                  <Link
                    to={
                      returnTo
                        ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
                        : '/signup'
                    }
                    className="text-primary duration-200 hover:opacity-70"
                  >
                    Sign up
                  </Link>
                </Trans>
              </motion.p>
            )}
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={formItemVariants}
            className="text-center text-muted-foreground text-xs"
          >
            <Trans>Secure digital signatures powered by BchatSign</Trans>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
