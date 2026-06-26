import {
  IS_GOOGLE_SSO_ENABLED,
  IS_MICROSOFT_SSO_ENABLED,
  IS_OIDC_SSO_ENABLED,
  isSignupEnabledForProvider,
} from '@bchatsign/lib/constants/auth';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '@bchatsign/lib/server-only/legal-content';
import { isValidReturnTo, normalizeReturnTo } from '@bchatsign/lib/utils/is-valid-return-to';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { redirect } from 'react-router';

import { BrandHero } from '~/components/brand-hero';
import { SignUpForm } from '~/components/forms/signup';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/signup';

export function meta() {
  return appMetaTags(msg`Sign Up`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const isEmailPasswordSignupEnabled = isSignupEnabledForProvider('email');
  const isGoogleSignupEnabled = IS_GOOGLE_SSO_ENABLED && isSignupEnabledForProvider('google');
  const isMicrosoftSignupEnabled = IS_MICROSOFT_SSO_ENABLED && isSignupEnabledForProvider('microsoft');
  const isOidcSignupEnabled = IS_OIDC_SSO_ENABLED && isSignupEnabledForProvider('oidc');

  const isAnySignupEnabled =
    isEmailPasswordSignupEnabled || isGoogleSignupEnabled || isMicrosoftSignupEnabled || isOidcSignupEnabled;

  if (!isAnySignupEnabled) {
    throw redirect('/signin');
  }

  let returnTo = new URL(request.url).searchParams.get('returnTo') ?? undefined;

  returnTo = isValidReturnTo(returnTo) ? normalizeReturnTo(returnTo) : undefined;

  return {
    isEmailPasswordSignupEnabled,
    isGoogleSignupEnabled,
    isMicrosoftSignupEnabled,
    isOidcSignupEnabled,
    returnTo,
    termsContent: TERMS_OF_SERVICE,
    policyContent: PRIVACY_POLICY,
  };
}

const formContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
} as const;

const formItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const;

export default function SignUp({ loaderData }: Route.ComponentProps) {
  const {
    isEmailPasswordSignupEnabled,
    isGoogleSignupEnabled,
    isMicrosoftSignupEnabled,
    isOidcSignupEnabled,
    returnTo,
    termsContent,
    policyContent,
  } = loaderData;

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
            <motion.h1 variants={formItemVariants} className="font-semibold text-2xl">
              <Trans>Create a new account</Trans>
            </motion.h1>

            <motion.p
              variants={formItemVariants}
              className="mt-2 text-muted-foreground text-sm"
            >
              <Trans>
                Create your account and start using state-of-the-art document signing. Open and beautiful signing is
                within your grasp.
              </Trans>
            </motion.p>

            <hr className="-mx-8 my-4 border-border/50" />

            <motion.div variants={formItemVariants}>
              <SignUpForm
                isEmailPasswordSignupEnabled={isEmailPasswordSignupEnabled}
                isGoogleSignupEnabled={isGoogleSignupEnabled}
                isMicrosoftSignupEnabled={isMicrosoftSignupEnabled}
                isOidcSignupEnabled={isOidcSignupEnabled}
                returnTo={returnTo}
                termsContent={termsContent}
                policyContent={policyContent}
              />
            </motion.div>
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
