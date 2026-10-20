import { Trans } from '@lingui/react/macro';

import { Link, Section, Text } from '../components';
import { useBranding } from '../providers/branding';

export type TemplateFooterProps = {
  isDocument?: boolean;
};

export const TemplateFooter = ({ isDocument = true }: TemplateFooterProps) => {
  const branding = useBranding();

  return (
    <Section>
      {isDocument && !branding.brandingHidePoweredBy && (
        <Text className="my-4 text-base text-slate-400">
          <Trans>
            Este documento foi enviado usando o{' '}
            <Link className="text-[#7AC455]" href="https://assine.bchat.com.br/signin">
              BchatSign
            </Link>
            .
          </Trans>
        </Text>
      )}

      {branding.brandingEnabled && branding.brandingCompanyDetails && (
        <Text className="my-8 text-slate-400 text-sm">
          {branding.brandingCompanyDetails.split('\n').map((line, idx) => {
            return (
              <>
                {idx > 0 && <br />}
                {line}
              </>
            );
          })}
        </Text>
      )}

      {!branding.brandingEnabled && (
        <Text className="my-8 text-slate-400 text-sm">
          Bolt360 Assessoria, Inc.
          <br />
          Rua Bezerra Salustino, 1902, Lagoa Nova, Natal RN, 59075-225, Brasil
        </Text>
      )}
    </Section>
  );
};

export default TemplateFooter;
