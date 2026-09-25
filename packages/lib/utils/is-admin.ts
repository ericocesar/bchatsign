import { Role } from '@bchatsign/prisma/generated/types';
import type { User } from '@prisma/client';

export const isAdmin = (user: Pick<User, 'roles'>) => user.roles.includes(Role.ADMIN);
