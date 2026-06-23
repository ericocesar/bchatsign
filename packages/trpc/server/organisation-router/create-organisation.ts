import { createCheckoutSession } from '@bchatsign/ee/server-only/stripe/create-checkout-session';
import { createCustomer } from '@bchatsign/ee/server-only/stripe/create-customer';
import { IS_BILLING_ENABLED, NEXT_PUBLIC_WEBAPP_URL } from '@bchatsign/lib/constants/app';
import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import { createOrganisation } from '@bchatsign/lib/server-only/organisation/create-organisation';
import { createTeam } from '@bchatsign/lib/server-only/team/create-team';
import { getSubscriptionClaim } from '@bchatsign/lib/server-only/subscription/get-subscription-claim';
import { INTERNAL_CLAIM_ID } from '@bchatsign/lib/types/subscription';
import { prefixedId } from '@bchatsign/lib/universal/id';
import { generateStripeOrganisationCreateMetadata } from '@bchatsign/lib/utils/billing';
import { prisma } from '@bchatsign/prisma';
import { OrganisationType } from '@prisma/client';
import { authenticatedProcedure } from '../trpc';
import { ZCreateOrganisationRequestSchema, ZCreateOrganisationResponseSchema } from './create-organisation.types';

export const createOrganisationRoute = authenticatedProcedure
  // .meta(createOrganisationMeta)
  .input(ZCreateOrganisationRequestSchema)
  .output(ZCreateOrganisationResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { name, priceId } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        priceId,
      },
    });

    // Check if user can create a free organiastion.
    if (IS_BILLING_ENABLED() && !priceId) {
      const userOrganisations = await prisma.organisation.findMany({
        where: {
          ownerUserId: user.id,
          subscription: {
            is: null,
          },
        },
      });

      if (userOrganisations.length >= 1) {
        throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
          message: 'You have reached the maximum number of free organisations.',
        });
      }
    }

    // Create checkout session for payment.
    if (IS_BILLING_ENABLED() && priceId) {
      const customer = await createCustomer({
        email: user.email,
        name: user.name || user.email,
      });

      const checkoutUrl = await createCheckoutSession({
        priceId,
        customerId: customer.id,
        returnUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/settings/organisations`,
        subscriptionMetadata: generateStripeOrganisationCreateMetadata(name, user.id),
      });

      return {
        paymentRequired: true,
        checkoutUrl,
      };
    }

    // Free organisations should be Personal by default.
    const organisationType = IS_BILLING_ENABLED() ? OrganisationType.PERSONAL : OrganisationType.ORGANISATION;

    const freeSubscriptionClaim = await getSubscriptionClaim(INTERNAL_CLAIM_ID.FREE);

    const organisation = await createOrganisation({
      userId: user.id,
      name,
      type: organisationType,
      claim: freeSubscriptionClaim,
    });

    await createTeam({
      userId: user.id,
      teamName: buildInitialTeamName(name),
      teamUrl: prefixedId('team'),
      organisationId: organisation.id,
      inheritMembers: true,
    });

    return {
      paymentRequired: false,
    };
  });

const buildInitialTeamName = (organisationName: string) => {
  const trimmedOrganisationName = organisationName.trim();
  const maxOrganisationNameLength = 25;
  const safeOrganisationName = trimmedOrganisationName.slice(0, maxOrganisationNameLength).trimEnd();

  return `${safeOrganisationName} Team`;
};
