import { IS_BILLING_ENABLED } from '@bchatsign/lib/constants/app';
import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '@bchatsign/lib/constants/teams';
import { AppError, AppErrorCode } from '@bchatsign/lib/errors/app-error';
import { buildBrandingLogoData } from '@bchatsign/lib/server-only/branding/store-branding-logo';
import { getOrganisationClaimByTeamId } from '@bchatsign/lib/server-only/organisation/get-organisation-claims';
import { buildTeamWhereQuery } from '@bchatsign/lib/utils/teams';
import { prisma } from '@bchatsign/prisma';

import { authenticatedProcedure } from '../trpc';
import {
  ZUpdateTeamBrandingLogoRequestSchema,
  ZUpdateTeamBrandingLogoResponseSchema,
} from './update-team-branding-logo.types';

export const updateTeamBrandingLogoRoute = authenticatedProcedure
  .input(ZUpdateTeamBrandingLogoRequestSchema)
  .output(ZUpdateTeamBrandingLogoResponseSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx;
    const { payload, brandingLogo } = input;
    const { teamId } = payload;

    ctx.logger.info({
      input: {
        teamId,
      },
    });

    const team = await prisma.team.findFirst({
      where: buildTeamWhereQuery({
        teamId,
        userId: user.id,
        roles: TEAM_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_TEAM'],
      }),
    });

    if (!team) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, {
        message: 'You do not have permission to update this team.',
      });
    }

    // Setting a logo requires the custom-branding entitlement; clearing it is
    // always allowed so a downgraded team can still remove its logo.
    if (brandingLogo && IS_BILLING_ENABLED()) {
      const claim = await getOrganisationClaimByTeamId({ teamId });

      if (claim.flags?.allowCustomBranding !== true) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: 'Your plan does not allow custom branding.',
        });
      }
    }

    const brandingLogoValue = brandingLogo ? await buildBrandingLogoData(brandingLogo) : '';

    await prisma.team.update({
      where: {
        id: team.id,
      },
      data: {
        teamGlobalSettings: {
          update: {
            brandingLogo: brandingLogoValue,
          },
        },
      },
    });
  });
