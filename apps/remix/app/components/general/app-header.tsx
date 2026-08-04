import { authClient } from '@bchatsign/auth/client';
import { trpc } from '@bchatsign/trpc/react';
import { cn } from '@bchatsign/ui/lib/utils';
import { Trans } from '@lingui/react/macro';
import { ReadStatus } from '@bchatsign/prisma/generated/types';
import {
  InboxIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  Link as LinkIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { type HTMLAttributes, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { BrandingLogo } from '~/components/general/branding-logo';

export type HeaderProps = HTMLAttributes<HTMLDivElement> & {
  teamUrl?: string | null;
};

export const Header = ({ teamUrl, className, ...props }: HeaderProps) => {
  const [scrollY, setScrollY] = useState(0);
  const { pathname } = useLocation();

  const { data: unreadCountData } = trpc.document.inbox.getCount.useQuery({
    readStatus: ReadStatus.NOT_OPENED,
  });

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const teamBaseUrl = teamUrl ? `/t/${teamUrl}` : '/dashboard';
  const navigationLinks = [
    { href: '/dashboard', label: <Trans>Dashboard</Trans>, icon: LayoutDashboardIcon },
    ...(teamUrl
      ? [
          { href: `${teamBaseUrl}/documents`, label: <Trans>Documents</Trans>, icon: LinkIcon },
          { href: `${teamBaseUrl}/templates`, label: <Trans>Templates</Trans>, icon: LayoutTemplateIcon },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }

    return pathname?.startsWith(href);
  };

  return (
    <header
      className={cn(
        'app-topbar border-transparent border-b transition-colors duration-200',
        scrollY > 5 && 'border-border/70 shadow-soft-sm',
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-3 px-4 md:px-6">
        {/* Mobile nav toggle */}
        <details className="group/mnav md:hidden">
          <summary className="-ml-1 flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <MenuIcon className="h-5 w-5" />
          </summary>

          <div className="absolute top-full right-0 left-0 z-50 mt-0 border-b bg-background p-2 shadow-md">
            <nav className="flex flex-col gap-0.5">
              {navigationLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 font-semibold text-[17px] text-black uppercase transition-all duration-200 hover:scale-[1.15] hover:bg-muted/60 hover:text-primary dark:text-white dark:hover:text-primary',
                      isActive(link.href) &&
                        'bg-[hsl(var(--brand-soft))] text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <hr className="my-1 border-border/70" />

            <Link
              to="/settings/profile"
              className="flex items-center gap-3 rounded-md px-3 py-2 font-semibold text-[17px] text-black uppercase transition-all duration-200 hover:scale-[1.15] hover:bg-muted/60 hover:text-primary dark:text-white dark:hover:text-primary"
            >
              <UserIcon className="h-4 w-4" />
              <Trans>Account</Trans>
            </Link>

            <button
              type="button"
              onClick={() => void authClient.signOut()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 font-semibold text-[17px] text-black uppercase transition-all duration-200 hover:scale-[1.15] hover:bg-muted/60 hover:text-primary dark:text-white dark:hover:text-primary"
            >
              <LogOutIcon className="h-4 w-4" />
              <Trans>Sign Out</Trans>
            </button>
          </div>
        </details>

        {/* Home link */}
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-2 ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandingLogo className="h-6 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <nav className="ml-4 hidden items-center gap-0.5 md:flex">
          {navigationLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-bold text-[16px] text-black uppercase transition-all duration-200 hover:scale-[1.15] hover:bg-muted/60 hover:text-primary dark:text-white dark:hover:text-primary',
                  isActive(link.href) &&
                    'bg-[hsl(var(--brand-soft))] text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]',
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/inbox"
            aria-label="Inbox"
            className="relative hidden h-9 w-9 items-center justify-center rounded-lg p-0 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
          >
            <InboxIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />

            {unreadCountData && unreadCountData.count > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1 font-semibold text-[10px] text-white ring-2 ring-card">
                {unreadCountData.count > 99 ? '99+' : unreadCountData.count}
              </span>
            )}
          </Link>

          <Link
            to="/settings/profile"
            className="hidden h-9 items-center gap-2 rounded-lg px-2 font-bold text-black uppercase transition-all duration-200 hover:scale-[1.15] hover:bg-muted/60 hover:text-primary md:inline-flex dark:text-white dark:hover:text-primary"
          >
            <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[16px]">
              <Trans>Account</Trans>
            </span>
          </Link>

          <button
            type="button"
            className="hidden h-9 items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
            onClick={() => void authClient.signOut()}
          >
            <LogOutIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};
