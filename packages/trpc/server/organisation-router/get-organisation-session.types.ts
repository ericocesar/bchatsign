import { ZOrganisationSchema } from '@bchatsign/lib/types/organisation';
import { OrganisationMemberRole, TeamMemberRole } from '@bchatsign/prisma/generated/types';
import SubscriptionSchema from '@bchatsign/prisma/generated/zod/modelSchema/SubscriptionSchema';
import { TeamEmailSchema } from '@bchatsign/prisma/generated/zod/modelSchema/TeamEmailSchema';
import TeamSchema from '@bchatsign/prisma/generated/zod/modelSchema/TeamSchema';
import { z } from 'zod';

export const ZGetOrganisationSessionResponseSchema = ZOrganisationSchema.extend({
  teams: z.array(
    TeamSchema.pick({
      id: true,
      name: true,
      url: true,
      createdAt: true,
      avatarImageId: true,
      organisationId: true,
    }).extend({
      currentTeamRole: z.nativeEnum(TeamMemberRole),
      teamEmail: TeamEmailSchema.pick({ email: true }).nullable(),
      preferences: z.object({
        aiFeaturesEnabled: z.boolean(),
      }),
    }),
  ),
  subscription: SubscriptionSchema.nullable(),
  currentOrganisationRole: z.nativeEnum(OrganisationMemberRole),
}).array();

export type TGetOrganisationSessionResponse = z.infer<typeof ZGetOrganisationSessionResponseSchema>;

export type TeamSession = TGetOrganisationSessionResponse[number]['teams'][number];
export type OrganisationSession = TGetOrganisationSessionResponse[number];
