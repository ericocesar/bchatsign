import type { DocumentVisibility as PrismaDocumentVisibility } from '@prisma/client';
import { z } from 'zod';

const DocumentVisibilityEnum = {
	ADMIN: 'ADMIN',
	EVERYONE: 'EVERYONE',
	MANAGER_AND_ABOVE: 'MANAGER_AND_ABOVE',
} as const satisfies Record<PrismaDocumentVisibility, PrismaDocumentVisibility>;

export const ZDocumentVisibilitySchema = z.nativeEnum(DocumentVisibilityEnum);
export const DocumentVisibility = ZDocumentVisibilitySchema.enum;
export type TDocumentVisibility = z.infer<typeof ZDocumentVisibilitySchema>;
