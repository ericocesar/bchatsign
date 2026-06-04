import LogoSvg from '@documenso/assets/logo.svg';
import LogoMarkImage from '@documenso/assets/logo_icon.png';
import { authClient } from '@documenso/auth/client';
import { useOptionalCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { useSession } from '@documenso/lib/client-only/providers/session';
import { formatAvatarUrl } from '@documenso/lib/utils/avatars';
import { canExecuteOrganisationAction } from '@documenso/lib/utils/organisations';
import { extractInitials } from '@documenso/lib/utils/recipient-formatter';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';
import { cn } from '@documenso/ui/lib/utils';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  Building2Icon,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  InboxIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  Link as LinkIcon,
  LogOutIcon,
  Plus,
  Settings2Icon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react';
import { type HTMLAttributes, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { useOptionalCurrentTeam } from '~/providers/team';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'documenso:sidebar-collapsed';

export type AppSidebarProps = HTMLAttributes<HTMLDivElement> & {
  forceExpanded?: boolean;
};

type SidebarLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  disabled?: boolean;
};

type SidebarAvatarProps = {
  src?: string;
  fallback: string;
};

const SidebarAvatar = ({ src, fallback }: SidebarAvatarProps) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-[11px] text-muted-foreground uppercase">
    {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{fallback}</span>}
  </span>
);

const useCollapsedState = (): [boolean, (next: boolean) => void] => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);

    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const set = (next: boolean) => {
    setCollapsed(next);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
    }
  };

  return [collapsed, set];
};

const AppSidebarOrgSwitcher = ({ collapsed }: { collapsed: boolean }) => {
  const { t: _ } = useLingui();
  const { user, organisations } = useSession();
  const { pathname } = useLocation();

  const isPathOrgUrl = (orgUrl: string) => {
    if (!pathname || !pathname.startsWith(`/o/`)) {
      return false;
    }

    return pathname.split('/')[2] === orgUrl;
  };

  const currentOrganisation = useOptionalCurrentOrganisation();
  const currentTeam = useOptionalCurrentTeam();

  const formatAvatarFallback = (name?: string) => {
    if (name !== undefined) {
      return name.slice(0, 1).toUpperCase();
    }

    return user.name ? extractInitials(user.name) : user.email.slice(0, 1).toUpperCase();
  };

  const triggerText = (() => {
    if (currentTeam) {
      return {
        avatarSrc: formatAvatarUrl(currentTeam.avatarImageId),
        avatarFallback: formatAvatarFallback(currentTeam.name),
        primaryText: currentTeam.name,
      };
    }

    if (currentOrganisation) {
      return {
        avatarSrc: formatAvatarUrl(currentOrganisation.avatarImageId),
        avatarFallback: formatAvatarFallback(currentOrganisation.name),
        primaryText: currentOrganisation.name,
      };
    }

    return {
      avatarSrc: formatAvatarUrl(user.avatarImageId),
      avatarFallback: formatAvatarFallback(user.name ?? user.email),
      primaryText: user.name,
    };
  })();

  const displayedOrg = currentOrganisation ?? organisations.find((org) => isPathOrgUrl(org.url)) ?? null;

  const isOrgSelected = (org: { id: string; url: string }) =>
    currentOrganisation?.id === org.id || (!currentOrganisation && isPathOrgUrl(org.url));

  return (
    <details
      data-testid="sidebar-org-switcher"
      className={cn(
        'group/switcher relative w-full rounded-lg text-left text-sm',
        '[&_summary::-webkit-details-marker]:hidden',
        'open:bg-muted/40',
      )}
    >
      <summary
        className={cn(
          'flex w-full cursor-pointer list-none items-center gap-3 rounded-lg p-2 ring-offset-background transition-colors',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className={cn('flex min-w-0 flex-1 items-center gap-3', collapsed && 'flex-none justify-center')}>
          <SidebarAvatar src={triggerText.avatarSrc} fallback={triggerText.avatarFallback} />

          {!collapsed && (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate font-medium text-[13px] text-foreground">{triggerText.primaryText}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open/switcher:rotate-180" />
            </span>
          )}
        </span>
      </summary>

      {!collapsed && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[18rem] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md md:right-0 md:left-auto md:w-[24rem]">
          <div className="border-b p-2">
            <h3 className="flex items-center px-2 font-medium text-muted-foreground text-sm">
              <Building2Icon className="mr-2 h-3.5 w-3.5" />
              <Trans>Organizações</Trans>
            </h3>
          </div>

          <ul className="max-h-48 space-y-1 overflow-y-auto p-1.5">
            {organisations.map((org) => (
              <li key={org.id} className="group/orgitem relative">
                <Link
                  to={`/o/${org.url}`}
                  className={cn(
                    'flex w-full items-center space-x-2 rounded-sm px-4 py-2 pr-8 text-muted-foreground text-sm hover:bg-accent',
                    isOrgSelected(org) && 'bg-accent',
                  )}
                >
                  <span
                    className={cn('min-w-0 flex-1 truncate', {
                      'font-semibold': isOrgSelected(org),
                    })}
                  >
                    {org.name}
                  </span>
                </Link>

                {canExecuteOrganisationAction('MANAGE_ORGANISATION', org.currentOrganisationRole) && (
                  <Link
                    to={`/o/${org.url}/settings`}
                    aria-label={_(msg`Open organisation settings`)}
                    className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm border p-1 text-muted-foreground transition-opacity hover:bg-background"
                  >
                    <Settings2Icon className="h-3.5 w-3.5" />
                  </Link>
                )}
              </li>
            ))}

            <li>
              <Link
                to="/settings/organisations?action=add-organisation"
                className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                <Trans>Criar Organização</Trans>
              </Link>
            </li>
          </ul>

          <div className="border-t">
            <h3 className="flex items-center px-4 pt-3 pb-1 font-medium text-muted-foreground text-sm">
              <UsersIcon className="mr-2 h-3.5 w-3.5" />
              <Trans>Equipes</Trans>
            </h3>

            <ul className="space-y-1 p-1.5">
              {displayedOrg ? (
                displayedOrg.teams.map((team) => (
                  <li key={team.id} className="group/teamitem relative">
                    <Link
                      to={`/t/${team.url}`}
                      className={cn(
                        'flex w-full items-center space-x-2 rounded-sm px-4 py-2 pr-8 text-muted-foreground text-sm hover:bg-accent',
                        currentTeam?.id === team.id && 'bg-accent',
                      )}
                    >
                      <span
                        className={cn('min-w-0 flex-1 truncate', {
                          'font-semibold': currentTeam?.id === team.id,
                        })}
                      >
                        {team.name}
                      </span>
                    </Link>

                    {canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole) && (
                      <Link
                        to={`/t/${team.url}/settings`}
                        aria-label={_(msg`Open team settings`)}
                        className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm border p-1 text-muted-foreground transition-opacity hover:bg-background"
                      >
                        <Settings2Icon className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </li>
                ))
              ) : (
                <li>
                  <div className="my-6 flex items-center justify-center px-2 text-center text-muted-foreground text-sm">
                    <Trans>Select an organisation to view teams</Trans>
                  </div>
                </li>
              )}

              {displayedOrg && (
                <li>
                  <Link
                    to={`/o/${displayedOrg.url}/settings/teams?action=add-team`}
                    className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <Trans>Create Team</Trans>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="border-t p-1.5">
            <Link
              to="/inbox"
              className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
            >
              <InboxIcon className="mr-2 h-4 w-4" />
              <Trans>Caixa de Entrada Pessoal</Trans>
            </Link>

            <Link
              to="/settings/profile"
              className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              <Trans>Account</Trans>
            </Link>

            <button
              type="button"
              onClick={() => {
                void authClient.signOut();
              }}
              className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              <Trans>Sign Out</Trans>
            </button>
          </div>
        </div>
      )}
    </details>
  );
};

type SidebarNavItemProps = {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  active: boolean;
  collapsed: boolean;
};

const SidebarNavItem = ({ href, label, icon: Icon, active, collapsed }: SidebarNavItemProps) => {
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group/link relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-[7px] font-medium text-[15px] transition-all duration-200 ease-out',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'text-foreground hover:bg-muted/60',
        active &&
          'bg-[hsl(var(--brand-soft))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--brand-soft))] hover:text-[hsl(var(--primary))]',
        collapsed && 'justify-center px-2',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-2 left-0 w-[2.5px] origin-center rounded-r-full bg-[hsl(var(--primary))] transition-all duration-300 ease-out',
          active
            ? 'scale-y-100 opacity-100'
            : 'scale-y-0 opacity-0 group-hover/link:scale-y-50 group-hover/link:opacity-40',
        )}
      />

      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-transform duration-200 ease-out',
          'group-hover/link:scale-110',
          active && 'text-[hsl(var(--primary))]',
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />

      {!collapsed && (
        <span className="truncate font-['Oswald',sans-serif] font-medium uppercase tracking-[0.05em]">{label}</span>
      )}
    </Link>
  );
};

export const AppSidebar = ({ className, forceExpanded = false, ...props }: AppSidebarProps) => {
  const { t: _ } = useLingui();
  const { organisations } = useSession();
  const { pathname } = useLocation();
  const currentTeam = useOptionalCurrentTeam();
  const [persistedCollapsed, setPersistedCollapsed] = useCollapsedState();

  const collapsed = forceExpanded ? false : persistedCollapsed;

  const fallbackTeamUrl = (() => {
    if (currentTeam?.url) {
      return currentTeam.url;
    }

    for (const org of organisations) {
      for (const team of org.teams) {
        return team.url;
      }
    }

    return null;
  })();

  const links: SidebarLink[] = (() => {
    const dashboardLink: SidebarLink = {
      href: '/dashboard',
      label: _(msg`Dashboard`),
      icon: LayoutDashboardIcon,
    };

    if (!fallbackTeamUrl) {
      return [dashboardLink];
    }

    return [
      dashboardLink,
      {
        href: `/t/${fallbackTeamUrl}/documents`,
        label: _(msg`Documents`),
        icon: LinkIcon,
      },
      {
        href: `/t/${fallbackTeamUrl}/templates`,
        label: _(msg`Templates`),
        icon: LayoutTemplateIcon,
      },
    ];
  })();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }

    return pathname?.startsWith(href);
  };

  return (
    <aside
      data-testid="app-sidebar"
      data-collapsed={collapsed}
      aria-label={_(msg`Primary navigation`)}
      className={cn(
        'group/sidebar app-sidebar',
        'transition-[width] duration-300 ease-out',
        collapsed ? 'w-[68px]' : 'w-[12.8rem]',
        className,
      )}
      {...props}
    >
      <div className={cn('flex h-[60px] items-center', collapsed ? 'justify-center px-0' : 'justify-between px-4')}>
        {collapsed ? (
          <Link
            to={fallbackTeamUrl ? `/t/${fallbackTeamUrl}` : '/dashboard'}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg"
            aria-label={_(msg`Home`)}
            title={_(msg`Home`)}
          >
            <img src={LogoMarkImage} alt="" className="h-7 w-7" />
          </Link>
        ) : (
          <Link
            to={fallbackTeamUrl ? `/t/${fallbackTeamUrl}` : '/dashboard'}
            className="flex items-center transition-opacity hover:opacity-80"
          >
            <img src={LogoSvg} alt="BchatSign" className="h-7 w-auto dark:invert" />
          </Link>
        )}
      </div>

      {!collapsed && (
        <div className="px-5 pt-3 pb-1.5">
          <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            <Trans>Workspace</Trans>
          </p>
        </div>
      )}

      <nav
        className={cn('flex-1 space-y-0.5 overflow-y-auto', collapsed ? 'p-2' : 'px-2.5 pb-2')}
        aria-label={_(msg`Primary`)}
      >
        {links.map(({ href, label, icon }) => (
          <SidebarNavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="border-border/70 border-t p-1.5">
        <button
          type="button"
          onClick={() => setPersistedCollapsed(!collapsed)}
          aria-label={collapsed ? _(msg`Expand sidebar`) : _(msg`Collapse sidebar`)}
          title={collapsed ? _(msg`Expand sidebar`) : undefined}
          aria-expanded={!collapsed}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 font-medium text-muted-foreground text-xs',
            'transition-colors hover:bg-muted/60 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span className="tracking-tight">
                <Trans>Collapse</Trans>
              </span>
            </>
          )}
        </button>
      </div>

      <div className="border-border/70 border-t p-1.5">
        <AppSidebarOrgSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
};
