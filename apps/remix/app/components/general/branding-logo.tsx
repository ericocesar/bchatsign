import LogoSvg from '@bchatsign/assets/logo.svg';
import type { ImgHTMLAttributes } from 'react';

export type LogoProps = ImgHTMLAttributes<HTMLImageElement>;

export const BrandingLogo = ({ className, ...props }: LogoProps) => {
  return <img src={LogoSvg} alt="BchatSign" className={`dark:invert ${className ?? ''}`.trim()} {...props} />;
};
