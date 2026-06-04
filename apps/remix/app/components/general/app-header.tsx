import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import { Sheet, SheetContent } from '@documenso/ui/primitives/sheet';
import { Trans } from '@lingui/react/macro';
import { ReadStatus } from '@prisma/client';
import { InboxIcon, MenuIcon, Search, SearchIcon } from 'lucide-react';
import { type HTMLAttributes, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { AppCommandMenu } from './app-command-menu';
import { AppSidebar } from './app-sidebar';

export type HeaderProps = HTMLAttributes<HTMLDivElement>;

export const Header = ({ className, ...props }: HeaderProps) => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [modifierKey, setModifierKey] = useState(() => 'Ctrl');

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

  useEffect(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const isMacOS = /Macintosh|Mac\s+OS\s+X/i.test(userAgent);

    setModifierKey(isMacOS ? '⌘' : 'Ctrl');
  }, []);

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
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open menu"
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>

        <Button
          variant="outline"
          className="hidden h-9 w-full max-w-sm items-center justify-between rounded-lg border-border/70 bg-muted/30 px-3 text-[13px] text-muted-foreground transition-all hover:bg-muted/60 md:flex"
          onClick={() => setIsCommandMenuOpen(true)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-normal">
              <Trans>Search documents, templates…</Trans>
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tracking-wider">
            {modifierKey} K
          </div>
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            className="relative hidden h-9 w-9 rounded-lg p-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground md:inline-flex"
          >
            <Link to="/inbox" aria-label="Inbox" className="inline-flex h-9 w-9 items-center justify-center">
              <InboxIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />

              {unreadCountData && unreadCountData.count > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1 font-semibold text-[10px] text-white ring-2 ring-card">
                  {unreadCountData.count > 99 ? '99+' : unreadCountData.count}
                </span>
              )}
            </Link>
          </Button>

          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => setIsCommandMenuOpen(true)}
              aria-label="Open search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:hidden"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:hidden"
            >
              <MenuIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <AppCommandMenu open={isCommandMenuOpen} onOpenChange={setIsCommandMenuOpen} />

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent position="left" size="sm" className="w-[12.8rem] p-0">
          <AppSidebar onClick={() => setIsMobileSidebarOpen(false)} forceExpanded className="border-r-0" />
        </SheetContent>
      </Sheet>
    </header>
  );
};
