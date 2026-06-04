import { authClient } from '@documenso/auth/client';
import { ONE_SECOND } from '@documenso/lib/constants/time';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export type VerifyEmailBannerProps = {
  email: string;
};

const RESEND_CONFIRMATION_EMAIL_TIMEOUT = 20 * ONE_SECOND;

export const VerifyEmailBanner = ({ email }: VerifyEmailBannerProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const onResendConfirmationEmail = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      setIsButtonDisabled(true);
      await authClient.emailPassword.resendVerifyEmail({ email: email });

      toast({
        title: _(msg`Success`),
        description: _(msg`Verification email sent successfully.`),
      });
      setTimeout(() => setIsButtonDisabled(false), RESEND_CONFIRMATION_EMAIL_TIMEOUT);
    } catch (err) {
      setIsButtonDisabled(false);

      toast({
        title: _(msg`Error`),
        description: _(msg`Something went wrong while sending the confirmation email.`),
        variant: 'destructive',
      });
    }

    setIsPending(false);
  };

  return (
    <div className="bg-yellow-200 dark:bg-yellow-400">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 font-medium text-sm text-yellow-900">
        <div className="flex items-center">
          <AlertTriangle className="mr-2.5 h-5 w-5" />
          <Trans>
            Verify your email address to unlock all features. We sent a confirmation email to <strong>{email}</strong>.
          </Trans>
        </div>

        <button
          type="button"
          className="h-auto rounded-md px-2.5 py-1.5 text-yellow-900 transition-colors hover:bg-yellow-100 hover:text-yellow-900 disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-yellow-500"
          disabled={isButtonDisabled || isPending}
          onClick={onResendConfirmationEmail}
        >
          {isPending ? (
            <Trans>Sending...</Trans>
          ) : isButtonDisabled ? (
            <Trans>Verification Email Sent</Trans>
          ) : (
            <Trans>Resend Confirmation Email</Trans>
          )}
        </button>
      </div>
    </div>
  );
};
