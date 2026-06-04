import { prisma } from '@documenso/prisma';
import { DocumentStatus, EnvelopeType } from '@prisma/client';

export type GetDashboardStatsOptions = {
  userId: number;
  teamId: number;
};

export type GetDashboardStatsResponse = {
  documents: {
    total: number;
    pending: number;
    completed: number;
    draft: number;
  };
  templates: {
    total: number;
  };
  teams: {
    total: number;
  };
};

export const getDashboardStats = async ({
  teamId,
  userId,
}: GetDashboardStatsOptions): Promise<GetDashboardStatsResponse> => {
  const documentWhere = {
    teamId,
    type: EnvelopeType.DOCUMENT,
    deletedAt: null,
  };

  const templateWhere = {
    teamId,
    type: EnvelopeType.TEMPLATE,
    deletedAt: null,
  };

  const [documentsTotal, documentsPending, documentsCompleted, documentsDraft, templatesTotal, teamsTotal] =
    await Promise.all([
      prisma.envelope.count({ where: documentWhere }),
      prisma.envelope.count({
        where: {
          ...documentWhere,
          status: DocumentStatus.PENDING,
        },
      }),
      prisma.envelope.count({
        where: {
          ...documentWhere,
          status: DocumentStatus.COMPLETED,
        },
      }),
      prisma.envelope.count({
        where: {
          ...documentWhere,
          status: DocumentStatus.DRAFT,
        },
      }),
      prisma.envelope.count({ where: templateWhere }),
      prisma.team.count({
        where: {
          organisation: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      }),
    ]);

  return {
    documents: {
      total: documentsTotal,
      pending: documentsPending,
      completed: documentsCompleted,
      draft: documentsDraft,
    },
    templates: {
      total: templatesTotal,
    },
    teams: {
      total: teamsTotal,
    },
  };
};
