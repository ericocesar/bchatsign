import { useOptionalCurrentOrganisation } from '@bchatsign/lib/client-only/providers/organisation';
import { SUPPORT_EMAIL } from '@bchatsign/lib/constants/app';
import { canExecuteOrganisationAction } from '@bchatsign/lib/utils/organisations';
import { trpc } from '@bchatsign/trpc/react';
import { cn } from '@bchatsign/ui/lib/utils';
import { useToast } from '@bchatsign/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { SubscriptionStatus } from '@prisma/client';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { match } from 'ts-pattern';

export const OrganisationBillingBanner = () => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const organisation = useOptionalCurrentOrganisation();

  const { mutateAsync: manageSubscription, isPending } = trpc.enterprise.billing.subscription.manage.useMutation();

  const handleManageSubscription = async (organisationId: string) => {
    try {
      const { redirectUrl } = await manageSubscription({ organisationId });

      window.open(redirectUrl, '_blank');
    } catch (err) {
      toast({
        title: _(msg`Something went wrong`),
        description: _(
          msg`We are unable to proceed to the billing portal at this time. Please try again, or contact support.`,
        ),
        variant: 'destructive',
        duration: 10000,
      });
    }
  };

  const subscriptionStatus = organisation?.subscription?.status;

  if (!organisation || subscriptionStatus === undefined || subscriptionStatus === SubscriptionStatus.ACTIVE) {
    return null;
  }

  const canManageBilling = canExecuteOrganisationAction('MANAGE_BILLING', organisation.currentOrganisationRole);

  return (
    <div
      className={cn({
        'bg-yellow-200 text-yellow-900 dark:bg-yellow-400': subscriptionStatus === SubscriptionStatus.PAST_DUE,
        'bg-destructive text-destructive-foreground': subscriptionStatus === SubscriptionStatus.INACTIVE,
      })}
    >
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 font-medium text-sm">
        <div className="flex items-center">
          <AlertTriangle className="mr-2.5 h-5 w-5" />

          {match(subscriptionStatus)
            .with(SubscriptionStatus.PAST_DUE, () => <Trans>Payment overdue</Trans>)
            .with(SubscriptionStatus.INACTIVE, () => <Trans>Restricted Access</Trans>)
            .exhaustive()}
        </div>

        {subscriptionStatus === SubscriptionStatus.PAST_DUE && canManageBilling && (
          <button
            type="button"
            className="rounded-md border border-current px-3 py-1.5 text-yellow-900 transition-colors hover:bg-yellow-100 disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-yellow-500"
            disabled={isPending}
            onClick={() => void handleManageSubscription(organisation.id)}
          >
            {isPending ? <Trans>Opening...</Trans> : <Trans>Resolve payment</Trans>}
          </button>
        )}

        {subscriptionStatus === SubscriptionStatus.INACTIVE && canManageBilling && (
          <Link
            to={`/o/${organisation.url}/settings/billing`}
            className="rounded-md border border-current px-3 py-1.5 text-destructive-foreground transition-colors hover:bg-destructive hover:text-white"
          >
            <Trans>Manage Billing</Trans>
          </Link>
        )}

        {!canManageBilling && (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-md border border-current px-3 py-1.5 underline-offset-4 hover:underline"
          >
            <Trans>Contact support</Trans>
          </a>
        )}
      </div>
    </div>
  );
};
