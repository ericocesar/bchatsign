import type { User } from '@prisma/client';
import { Role } from '@bchatsign/prisma/generated/types';

export const isAdmin = (user: Pick<User, 'roles'>) => user.roles.includes(Role.ADMIN);
