import { prisma } from '@bchatsign/prisma';
import { TeamMemberRole } from '@bchatsign/prisma/generated/types';
import { TeamSchema } from '@bchatsign/prisma/generated/zod/modelSchema/TeamSchema';
import { z } from 'zod';

import { buildTeamWhereQuery, getHighestTeamRoleInGroup } from '../../utils/teams';

export type GetTeamsOptions = {
  userId: number;

  /**
   * If teamId is undefined we get all teams the user belongs to.
   */
  teamId?: number;
};

export const ZGetTeamsResponseSchema = TeamSchema.extend({
  teamRole: z.nativeEnum(TeamMemberRole),
}).array();

export type TGetTeamsResponse = z.infer<typeof ZGetTeamsResponseSchema>;

export const getTeams = async ({ userId, teamId }: GetTeamsOptions) => {
  const teams = await prisma.team.findMany({
    where: buildTeamWhereQuery({ teamId, userId }),
    include: {
      teamGroups: {
        where: {
          organisationGroup: {
            organisationGroupMembers: {
              some: {
                organisationMember: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
  });

  return teams.map((team) => ({
    ...team,
    currentTeamRole: getHighestTeamRoleInGroup(team.teamGroups),
  }));
};
