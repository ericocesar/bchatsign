import { ZOrganisationSchema } from '@bchatsign/lib/types/organisation';
import OrganisationClaimSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationClaimSchema';
import OrganisationGlobalSettingsSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationGlobalSettingsSchema';
import OrganisationGroupMemberSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationGroupMemberSchema';
import OrganisationGroupSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationGroupSchema';
import OrganisationMemberSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationMemberSchema';
import OrganisationMonthlyStatSchema from '@bchatsign/prisma/generated/zod/modelSchema/OrganisationMonthlyStatSchema';
import SubscriptionSchema from '@bchatsign/prisma/generated/zod/modelSchema/SubscriptionSchema';
import TeamSchema from '@bchatsign/prisma/generated/zod/modelSchema/TeamSchema';
import UserSchema from '@bchatsign/prisma/generated/zod/modelSchema/UserSchema';
import { z } from 'zod';

export const ZGetAdminOrganisationRequestSchema = z.object({
  organisationId: z.string(),
});

export const ZGetAdminOrganisationResponseSchema = ZOrganisationSchema.extend({
  organisationGlobalSettings: OrganisationGlobalSettingsSchema,
  teams: z.array(
    TeamSchema.pick({
      id: true,
      name: true,
      url: true,
      createdAt: true,
      avatarImageId: true,
      organisationId: true,
    }),
  ),
  members: OrganisationMemberSchema.extend({
    user: UserSchema.pick({
      id: true,
      email: true,
      name: true,
    }),
    organisationGroupMembers: z.array(
      OrganisationGroupMemberSchema.pick({
        id: true,
        groupId: true,
      }).extend({
        group: OrganisationGroupSchema.pick({
          id: true,
          type: true,
          organisationRole: true,
        }),
      }),
    ),
  }).array(),
  subscription: SubscriptionSchema.nullable(),
  organisationClaim: OrganisationClaimSchema,
  monthlyStats: z.array(
    OrganisationMonthlyStatSchema.pick({
      period: true,
      documentCount: true,
      emailCount: true,
      apiCount: true,
    }),
  ),
});

export type TGetAdminOrganisationResponse = z.infer<typeof ZGetAdminOrganisationResponseSchema>;
