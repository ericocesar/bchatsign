-- Update default language and date format for DocumentMeta.
ALTER TABLE "DocumentMeta" ALTER COLUMN "language" SET DEFAULT 'pt-BR';
ALTER TABLE "DocumentMeta" ALTER COLUMN "dateFormat" SET DEFAULT 'dd/MM/yyyy HH:mm';

-- Update default language and date format for OrganisationGlobalSettings.
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "documentLanguage" SET DEFAULT 'pt-BR';
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "documentDateFormat" SET DEFAULT 'dd/MM/yyyy HH:mm';

-- Backfill existing rows.
-- DocumentMeta: any null dateFormat becomes the new default; legacy 'dd/MM;yyyy HH:mm' value
-- (no longer in VALID_DATE_FORMAT_VALUES) is migrated to the new default.
UPDATE "DocumentMeta"
SET "dateFormat" = 'dd/MM/yyyy HH:mm'
WHERE "dateFormat" IS NULL
   OR "dateFormat" = 'yyyy-MM-dd hh:mm a'
   OR "dateFormat" = 'dd/MM;yyyy HH:mm';

-- DocumentMeta: align language to pt-BR where the row was created with the legacy 'en' default.
UPDATE "DocumentMeta"
SET "language" = 'pt-BR'
WHERE "language" = 'en';

-- OrganisationGlobalSettings: same backfill strategy.
UPDATE "OrganisationGlobalSettings"
SET "documentDateFormat" = 'dd/MM/yyyy HH:mm'
WHERE "documentDateFormat" = 'yyyy-MM-dd hh:mm a'
   OR "documentDateFormat" = 'dd/MM;yyyy HH:mm';

UPDATE "OrganisationGlobalSettings"
SET "documentLanguage" = 'pt-BR'
WHERE "documentLanguage" = 'en';
