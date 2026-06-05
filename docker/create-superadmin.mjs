import { randomBytes } from 'node:crypto';

import { hashSync } from '@node-rs/bcrypt';
import {
  OrganisationGroupType,
  OrganisationMemberRole,
  OrganisationType,
  PrismaClient,
  Role,
  TeamMemberRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'ericocesar@webck.com.br';
const DEFAULT_PASSWORD = 'App12345!';
const DEFAULT_NAME = 'Erico Cesar';
const DEFAULT_DOCUMENT_EMAIL_SETTINGS = {
  recipientSigningRequest: true,
  recipientRemoved: true,
  recipientSigned: true,
  documentPending: true,
  documentCompleted: true,
  documentDeleted: true,
  ownerDocumentCompleted: true,
  ownerRecipientExpired: true,
  ownerDocumentCreated: true,
};
const DEFAULT_ENVELOPE_EXPIRATION_PERIOD = {
  unit: 'month',
  amount: 3,
};
const DEFAULT_ENVELOPE_REMINDER_SETTINGS = {
  sendAfter: { unit: 'day', amount: 5 },
  repeatEvery: { unit: 'day', amount: 2 },
};
const FREE_ORGANISATION_CLAIM = {
  originalSubscriptionClaimId: 'free',
  teamCount: 1,
  memberCount: 1,
  envelopeItemCount: 5,
  recipientCount: 0,
  flags: {
    allowLegacyEnvelopes: true,
  },
  documentRateLimits: [],
  documentQuota: null,
  emailRateLimits: [],
  emailQuota: null,
  apiRateLimits: [],
  apiQuota: null,
};

const generateId = (prefix) => `${prefix}_${randomBytes(12).toString('hex')}`;
const generateSlug = (prefix, userId) => `${prefix}-${userId}-${randomBytes(4).toString('hex')}`;
const normalizeFlags = (flags) => (flags && typeof flags === 'object' && !Array.isArray(flags) ? flags : {});

const email = (process.env.SUPERADMIN_EMAIL ?? DEFAULT_EMAIL).toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD ?? DEFAULT_PASSWORD;
const name = process.env.SUPERADMIN_NAME ?? DEFAULT_NAME;

const ensureUser = async () => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!existingUser) {
    return await prisma.user.create({
      data: {
        name,
        email,
        password: hashSync(password),
        emailVerified: new Date(),
        roles: [Role.USER, Role.ADMIN],
      },
    });
  }

  const roles = Array.from(new Set([...(existingUser.roles ?? []), Role.USER, Role.ADMIN]));

  return await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      name: existingUser.name || name,
      password: hashSync(password),
      emailVerified: existingUser.emailVerified ?? new Date(),
      roles,
      disabled: false,
    },
  });
};

const ensureOrganisationAndTeam = async (user) => {
  const existingOrganisation = await prisma.organisation.findFirst({
    where: {
      ownerUserId: user.id,
    },
    include: {
      groups: true,
      teams: true,
      organisationClaim: true,
      members: {
        where: {
          userId: user.id,
        },
        include: {
          organisationGroupMembers: true,
        },
      },
    },
  });

  if (!existingOrganisation) {
    await prisma.$transaction(async (tx) => {
      const organisationGlobalSettingsId = generateId('org_setting');
      const organisationClaimId = generateId('org_claim');
      const organisationAuthenticationPortalId = generateId('org_sso');
      const organisationId = generateId('org');
      const adminGroupId = generateId('org_group');
      const managerGroupId = generateId('org_group');
      const memberGroupId = generateId('org_group');
      const organisationMemberId = generateId('member');
      const teamGlobalSettingsId = generateId('team_setting');

      await tx.organisationGlobalSettings.create({
        data: {
          id: organisationGlobalSettingsId,
          documentLanguage: 'pt-BR',
          documentDateFormat: 'dd/MM/yyyy HH:mm',
          includeSenderDetails: true,
          includeSigningCertificate: true,
          includeAuditLog: false,
          typedSignatureEnabled: true,
          uploadSignatureEnabled: true,
          drawSignatureEnabled: true,
          emailDocumentSettings: DEFAULT_DOCUMENT_EMAIL_SETTINGS,
          envelopeExpirationPeriod: DEFAULT_ENVELOPE_EXPIRATION_PERIOD,
          reminderSettings: DEFAULT_ENVELOPE_REMINDER_SETTINGS,
          aiFeaturesEnabled: false,
        },
      });

      await tx.organisationClaim.create({
        data: {
          id: organisationClaimId,
          ...FREE_ORGANISATION_CLAIM,
        },
      });

      await tx.organisationAuthenticationPortal.create({
        data: {
          id: organisationAuthenticationPortalId,
          enabled: false,
          clientId: '',
          clientSecret: '',
          wellKnownUrl: '',
        },
      });

      await tx.organisation.create({
        data: {
          id: organisationId,
          name: 'Personal Organisation',
          url: generateSlug('personal-org', user.id),
          type: OrganisationType.PERSONAL,
          ownerUserId: user.id,
          organisationGlobalSettingsId,
          organisationClaimId,
          organisationAuthenticationPortalId,
          groups: {
            create: [
              {
                id: adminGroupId,
                type: OrganisationGroupType.INTERNAL_ORGANISATION,
                organisationRole: OrganisationMemberRole.ADMIN,
              },
              {
                id: managerGroupId,
                type: OrganisationGroupType.INTERNAL_ORGANISATION,
                organisationRole: OrganisationMemberRole.MANAGER,
              },
              {
                id: memberGroupId,
                type: OrganisationGroupType.INTERNAL_ORGANISATION,
                organisationRole: OrganisationMemberRole.MEMBER,
              },
            ],
          },
        },
      });

      await tx.organisationMember.create({
        data: {
          id: organisationMemberId,
          userId: user.id,
          organisationId,
          organisationGroupMembers: {
            create: {
              id: generateId('group_member'),
              groupId: adminGroupId,
            },
          },
        },
      });

      await tx.teamGlobalSettings.create({
        data: {
          id: teamGlobalSettingsId,
        },
      });

      const team = await tx.team.create({
        data: {
          name: 'Personal Team',
          url: generateSlug('personal-team', user.id),
          organisationId,
          teamGlobalSettingsId,
          teamGroups: {
            create: [
              {
                id: generateId('team_group'),
                organisationGroupId: adminGroupId,
                teamRole: TeamMemberRole.ADMIN,
              },
              {
                id: generateId('team_group'),
                organisationGroupId: managerGroupId,
                teamRole: TeamMemberRole.ADMIN,
              },
              {
                id: generateId('team_group'),
                organisationGroupId: memberGroupId,
                teamRole: TeamMemberRole.MEMBER,
              },
            ],
          },
        },
      });

      const internalTeamGroups = [TeamMemberRole.ADMIN, TeamMemberRole.MANAGER, TeamMemberRole.MEMBER];

      for (const teamRole of internalTeamGroups) {
        await tx.organisationGroup.create({
          data: {
            id: generateId('org_group'),
            type: OrganisationGroupType.INTERNAL_TEAM,
            organisationRole: OrganisationMemberRole.MEMBER,
            organisationId,
            teamGroups: {
              create: {
                id: generateId('team_group'),
                teamId: team.id,
                teamRole,
              },
            },
          },
        });
      }
    });

    console.log('Organizacao pessoal e time criados');
    return;
  }

  await prisma.organisationClaim.update({
    where: {
      id: existingOrganisation.organisationClaim.id,
    },
    data: {
      flags: {
        ...normalizeFlags(existingOrganisation.organisationClaim.flags),
        allowLegacyEnvelopes: true,
      },
    },
  });

  if (existingOrganisation.members.length === 0) {
    const adminGroup = existingOrganisation.groups.find(
      (group) =>
        group.type === OrganisationGroupType.INTERNAL_ORGANISATION &&
        group.organisationRole === OrganisationMemberRole.ADMIN,
    );

    if (adminGroup) {
      await prisma.organisationMember.create({
        data: {
          id: generateId('member'),
          userId: user.id,
          organisationId: existingOrganisation.id,
          organisationGroupMembers: {
            create: {
              id: generateId('group_member'),
              groupId: adminGroup.id,
            },
          },
        },
      });
    }
  }

  if (existingOrganisation.teams.length === 0) {
    const adminGroup = existingOrganisation.groups.find(
      (group) =>
        group.type === OrganisationGroupType.INTERNAL_ORGANISATION &&
        group.organisationRole === OrganisationMemberRole.ADMIN,
    );
    const managerGroup = existingOrganisation.groups.find(
      (group) =>
        group.type === OrganisationGroupType.INTERNAL_ORGANISATION &&
        group.organisationRole === OrganisationMemberRole.MANAGER,
    );
    const memberGroup = existingOrganisation.groups.find(
      (group) =>
        group.type === OrganisationGroupType.INTERNAL_ORGANISATION &&
        group.organisationRole === OrganisationMemberRole.MEMBER,
    );

    await prisma.$transaction(async (tx) => {
      const teamGlobalSettingsId = generateId('team_setting');

      await tx.teamGlobalSettings.create({
        data: {
          id: teamGlobalSettingsId,
        },
      });

      const team = await tx.team.create({
        data: {
          name: 'Personal Team',
          url: generateSlug('personal-team', user.id),
          organisationId: existingOrganisation.id,
          teamGlobalSettingsId,
          teamGroups: {
            create: [
              ...(adminGroup
                ? [
                    {
                      id: generateId('team_group'),
                      organisationGroupId: adminGroup.id,
                      teamRole: TeamMemberRole.ADMIN,
                    },
                  ]
                : []),
              ...(managerGroup
                ? [
                    {
                      id: generateId('team_group'),
                      organisationGroupId: managerGroup.id,
                      teamRole: TeamMemberRole.ADMIN,
                    },
                  ]
                : []),
              ...(memberGroup
                ? [
                    {
                      id: generateId('team_group'),
                      organisationGroupId: memberGroup.id,
                      teamRole: TeamMemberRole.MEMBER,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      const internalTeamGroups = [TeamMemberRole.ADMIN, TeamMemberRole.MANAGER, TeamMemberRole.MEMBER];

      for (const teamRole of internalTeamGroups) {
        await tx.organisationGroup.create({
          data: {
            id: generateId('org_group'),
            type: OrganisationGroupType.INTERNAL_TEAM,
            organisationRole: OrganisationMemberRole.MEMBER,
            organisationId: existingOrganisation.id,
            teamGroups: {
              create: {
                id: generateId('team_group'),
                teamId: team.id,
                teamRole,
              },
            },
          },
        });
      }
    });

    console.log('Time pessoal criado');
  }
};

const main = async () => {
  const user = await ensureUser();

  await ensureOrganisationAndTeam(user);

  console.log('Superadmin pronto');
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
