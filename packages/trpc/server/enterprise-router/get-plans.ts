import { getInternalClaimPlans } from '@bchatsign/ee/server-only/stripe/get-internal-claim-plans';
import { IS_BILLING_ENABLED } from '@bchatsign/lib/constants/app';
import { prisma } from '@bchatsign/prisma';

import { authenticatedProcedure } from '../trpc';

export const getPlansRoute = authenticatedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.id;

  const plans = await getInternalClaimPlans();

  let canCreateFreeOrganisation = false;

  if (IS_BILLING_ENABLED()) {
    const numberOfFreeOrganisations = await prisma.organisation.count({
      where: {
        ownerUserId: userId,
        subscription: {
          is: null,
        },
      },
    });

    canCreateFreeOrganisation = numberOfFreeOrganisations === 0;
  }

  return {
    plans,
    canCreateFreeOrganisation,
  };
});
