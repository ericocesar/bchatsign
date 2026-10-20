import { BRANDING_CSS_MAX_LENGTH } from '@bchatsign/lib/constants/branding';
import { ZEnvelopeExpirationPeriod } from '@bchatsign/lib/constants/envelope-expiration';
import { ZEnvelopeReminderSettings } from '@bchatsign/lib/constants/envelope-reminder';
import { SUPPORTED_LANGUAGE_CODES } from '@bchatsign/lib/constants/i18n';
import { ZCssVarsSchema } from '@bchatsign/lib/types/css-vars';
import { ZDefaultRecipientsSchema } from '@bchatsign/lib/types/default-recipients';
import { ZDocumentEmailSettingsSchema } from '@bchatsign/lib/types/document-email';
import { ZDocumentMetaDateFormatSchema, ZDocumentMetaTimezoneSchema } from '@bchatsign/lib/types/document-meta';
import { DocumentVisibility } from '@bchatsign/lib/types/document-visibility';
import { ZSanitizeBrandingCssWarningSchema } from '@bchatsign/lib/utils/sanitize-branding-css';
import { zEmail } from '@bchatsign/lib/utils/zod';
import { z } from 'zod';

export const ZUpdateOrganisationSettingsRequestSchema = z.object({
  organisationId: z.string(),
  data: z.object({
    // Document related settings.
    documentVisibility: z.nativeEnum(DocumentVisibility).optional(),
    documentLanguage: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
    documentTimezone: ZDocumentMetaTimezoneSchema.nullish(), // Null means local timezone.
    documentDateFormat: ZDocumentMetaDateFormatSchema.optional(),
    includeSenderDetails: z.boolean().optional(),
    includeSigningCertificate: z.boolean().optional(),
    includeAuditLog: z.boolean().optional(),
    typedSignatureEnabled: z.boolean().optional(),
    uploadSignatureEnabled: z.boolean().optional(),
    drawSignatureEnabled: z.boolean().optional(),
    defaultRecipients: ZDefaultRecipientsSchema.nullish(),
    delegateDocumentOwnership: z.boolean().nullish(),
    envelopeExpirationPeriod: ZEnvelopeExpirationPeriod.optional(),
    reminderSettings: ZEnvelopeReminderSettings.optional(),

    // Branding related settings.
    brandingEnabled: z.boolean().optional(),
    brandingLogo: z.string().optional(),
    brandingUrl: z.string().optional(),
    brandingCompanyDetails: z.string().optional(),
    brandingColors: ZCssVarsSchema.nullish(),
    brandingCss: z.string().max(BRANDING_CSS_MAX_LENGTH).optional(),

    // Email related settings.
    emailId: z.string().nullish(),
    emailReplyTo: zEmail().nullish(),
    // emailReplyToName: z.string().optional(),
    emailDocumentSettings: ZDocumentEmailSettingsSchema.optional(),

    // AI features settings.
    aiFeaturesEnabled: z.boolean().optional(),
  }),
});

export const ZUpdateOrganisationSettingsResponseSchema = z.object({
  cssWarnings: z.array(ZSanitizeBrandingCssWarningSchema).optional(),
});
