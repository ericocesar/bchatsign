import LogoMarkImage from '@documenso/assets/logo_icon.png';
import LogoImage from '@documenso/assets/static/logo.png';
import { authClient } from '@documenso/auth/client';
import { useOptionalCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { useSession } from '@documenso/lib/client-only/providers/session';
import { formatAvatarUrl } from '@documenso/lib/utils/avatars';
import { canExecuteOrganisationAction } from '@documenso/lib/utils/organisations';
import { extractInitials } from '@documenso/lib/utils/recipient-formatter';
import { canExecuteTeamAction } from '@documenso/lib/utils/teams';
import { AnimateGenericFadeInOut } from '@documenso/ui/components/animate/animate-generic-fade-in-out';
import { LanguageSwitcherDialog } from '@documenso/ui/components/common/language-switcher-dialog';
import { cn } from '@documenso/ui/lib/utils';
import { AvatarWithText } from '@documenso/ui/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@documenso/ui/primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@documenso/ui/primitives/tooltip';
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
import { type HTMLAttributes, useEffect, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
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

const AppSidebarOrgTrigger = ({ collapsed }: { collapsed: boolean }) => {
  const { t: _ } = useLingui();
  const { user, organisations } = useSession();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null);
  const [languageSwitcherOpen, setLanguageSwitcherOpen] = useState(false);

  const isPathOrgUrl = (orgUrl: string) => {
    if (!pathname || !pathname.startsWith(`/o/`)) {
      return false;
    }

    return pathname.split('/')[2] === orgUrl;
  };

  const selectedOrg = organisations.find((org) => isPathOrgUrl(org.url));
  const hoveredOrg = organisations.find((org) => org.id === hoveredOrgId || organisations.length === 1);

  const currentOrganisation = useOptionalCurrentOrganisation();
  const currentTeam = useOptionalCurrentTeam();

  const displayedOrg = hoveredOrg || currentOrganisation || selectedOrg;

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

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHoveredOrgId(currentOrganisation?.id || null);
    }

    setIsOpen(open);
  };

  const triggerButton = (
    <button
      type="button"
      data-testid="sidebar-menu-switcher"
      aria-label={_(msg`Open organisation menu`)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm ring-offset-background transition-colors',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        collapsed && 'justify-center px-0',
      )}
    >
      <AvatarWithText
        avatarClass="h-8 w-8"
        avatarSrc={triggerText.avatarSrc}
        avatarFallback={triggerText.avatarFallback}
        primaryText={
          <span className="truncate font-medium text-[13px] text-foreground">{triggerText.primaryText}</span>
        }
        rightSideComponent={
          collapsed ? null : <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        }
        textSectionClassName={cn(collapsed && 'hidden')}
      />
    </button>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {triggerText.primaryText}
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn('z-[60] flex w-[18rem] p-0 md:min-w-[40rem]')}
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'start' : 'end'}
        forceMount
      >
        <div className="flex h-[400px] w-full divide-x">
          <div className="flex w-full flex-col md:w-1/3">
            <div className="flex h-12 items-center border-b p-2">
              <h3 className="flex items-center px-2 font-medium text-muted-foreground text-sm">
                <Building2Icon className="mr-2 h-3.5 w-3.5" />
                <Trans>Organizações</Trans>
              </h3>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              {organisations.map((org) => (
                <div className="group relative" key={org.id} onMouseEnter={() => setHoveredOrgId(org.id)}>
                  <DropdownMenuItem
                    className={cn(
                      'w-full px-4 py-2 text-muted-foreground',
                      org.id === currentOrganisation?.id && !hoveredOrgId && 'bg-accent',
                      org.id === hoveredOrgId && 'bg-accent',
                    )}
                    asChild
                  >
                    <Link to={`/o/${org.url}`} className="flex items-center space-x-2 pr-8">
                      <span
                        className={cn('min-w-0 flex-1 truncate', {
                          'font-semibold': org.id === selectedOrg?.id,
                        })}
                      >
                        {org.name}
                      </span>
                    </Link>
                  </DropdownMenuItem>

                  {canExecuteOrganisationAction('MANAGE_ORGANISATION', org.currentOrganisationRole) && (
                    <div className="absolute top-0 right-0 bottom-0 flex items-center justify-center">
                      <Link
                        to={`/o/${org.url}/settings`}
                        className="mr-2 rounded-sm border p-1 text-muted-foreground transition-opacity duration-200 group-hover:opacity-100 md:opacity-0"
                      >
                        <Settings2Icon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}

              <Link
                to="/settings/organisations?action=add-organisation"
                className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                <Trans>Criar Organização</Trans>
              </Link>
            </div>
          </div>

          <div className="hidden w-1/3 flex-col md:flex">
            <div className="flex h-12 items-center border-b p-2">
              <h3 className="flex items-center px-2 font-medium text-muted-foreground text-sm">
                <UsersIcon className="mr-2 h-3.5 w-3.5" />
                <Trans>Equipes</Trans>
              </h3>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              <AnimateGenericFadeInOut key={displayedOrg ? 'displayed-org' : 'no-org'}>
                {hoveredOrg ? (
                  hoveredOrg.teams.map((team) => (
                    <div className="group relative" key={team.id}>
                      <DropdownMenuItem
                        className={cn(
                          'w-full px-4 py-2 text-muted-foreground',
                          team.id === currentTeam?.id && 'bg-accent',
                        )}
                        asChild
                      >
                        <Link to={`/t/${team.url}`} className="flex items-center space-x-2 pr-8">
                          <span
                            className={cn('min-w-0 flex-1 truncate', {
                              'font-semibold': team.id === currentTeam?.id,
                            })}
                          >
                            {team.name}
                          </span>
                        </Link>
                      </DropdownMenuItem>

                      {canExecuteTeamAction('MANAGE_TEAM', team.currentTeamRole) && (
                        <div className="absolute top-0 right-0 bottom-0 flex items-center justify-center">
                          <Link
                            to={`/t/${team.url}/settings`}
                            className="mr-2 rounded-sm border p-1 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          >
                            <Settings2Icon className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="my-12 flex items-center justify-center px-2 text-center text-muted-foreground text-sm">
                    <Trans>Select an organisation to view teams</Trans>
                  </div>
                )}

                {displayedOrg && (
                  <Link
                    to={`/o/${displayedOrg.url}/settings/teams?action=add-team`}
                    className="flex w-full items-center rounded-sm px-4 py-2 text-muted-foreground text-sm hover:bg-accent"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <Trans>Create Team</Trans>
                  </Link>
                )}
              </AnimateGenericFadeInOut>
            </div>
          </div>

          <div className="hidden w-1/3 flex-col md:flex">
            <div className="flex h-12 items-center border-b p-2">
              <h3 className="flex items-center px-2 font-medium text-muted-foreground text-sm">
                <SettingsIcon className="mr-2 h-3.5 w-3.5" />
                <Trans>Settings</Trans>
              </h3>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              <DropdownMenuItem className="px-4 py-2 text-muted-foreground" asChild>
                <Link to="/inbox">
                  <InboxIcon className="mr-2 h-4 w-4" />
                  <Trans>Caixa de Entrada Pessoal</Trans>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="px-4 py-2 text-muted-foreground" asChild>
                <Link to="/settings/profile">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <Trans>Account</Trans>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="px-4 py-2 text-muted-foreground"
                onClick={() => setLanguageSwitcherOpen(true)}
              >
                <Trans>Language</Trans>
              </DropdownMenuItem>

              <DropdownMenuItem className="px-4 py-2 text-muted-foreground" onSelect={async () => authClient.signOut()}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <Trans>Sign Out</Trans>
              </DropdownMenuItem>
            </div>
          </div>
        </div>
      </DropdownMenuContent>

      <LanguageSwitcherDialog open={languageSwitcherOpen} setOpen={setLanguageSwitcherOpen} />
    </DropdownMenu>
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
  const link = (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
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

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export const AppSidebar = ({ className, forceExpanded = false, ...props }: AppSidebarProps) => {
  const { t: _ } = useLingui();
  const { organisations } = useSession();
  const { pathname } = useLocation();
  const currentTeam = useOptionalCurrentTeam();
  const [persistedCollapsed, setPersistedCollapsed] = useCollapsedState();

  const collapsed = forceExpanded ? false : persistedCollapsed;

  useHotkeys(
    'mod+b',
    (event) => {
      if (forceExpanded) {
        return;
      }

      event.preventDefault();
      setPersistedCollapsed(!persistedCollapsed);
    },
    { enableOnFormTags: false },
    [persistedCollapsed, forceExpanded, setPersistedCollapsed],
  );

  const fallbackTeamUrl = useMemo(() => {
    if (currentTeam?.url) {
      return currentTeam.url;
    }

    for (const org of organisations) {
      for (const team of org.teams) {
        return team.url;
      }
    }

    return null;
  }, [currentTeam, organisations]);

  const links: SidebarLink[] = useMemo(() => {
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
  }, [fallbackTeamUrl, _]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }

    return pathname?.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={120}>
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
            >
              <img src={LogoMarkImage} alt="" className="h-7 w-7" />
            </Link>
          ) : (
            <Link
              to={fallbackTeamUrl ? `/t/${fallbackTeamUrl}` : '/dashboard'}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <img src={LogoImage} alt="BchatSign" className="h-6 w-auto dark:invert" />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPersistedCollapsed(!collapsed)}
                aria-label={collapsed ? _(msg`Expand sidebar`) : _(msg`Collapse sidebar`)}
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
                    <span className="ml-auto rounded border border-border/70 bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground tracking-wider">
                      ⌘B
                    </span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={10}>
                <Trans>Expand sidebar</Trans>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <div className="border-border/70 border-t p-1.5">
          <AppSidebarOrgTrigger collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
};
