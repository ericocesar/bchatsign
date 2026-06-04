import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

const statCardVariants = cva(
  'group/stat relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 text-card-foreground transition-all duration-200 ease-out',
  {
    variants: {
      tone: {
        brand: '',
        info: '',
        success: '',
        warning: '',
        neutral: '',
      },
    },
    defaultVariants: {
      tone: 'brand',
    },
  },
);

export type StatCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statCardVariants> & {
    /** Optional pre-formatted icon. Should be a Lucide icon component. */
    icon?: LucideIcon;
    /** Required: short title shown at the top (e.g. "Documents"). */
    title: string;
    /**
     * Optional link to navigate to when the card title is clicked. When
     * provided, the title becomes a focusable link with an arrow indicator.
     */
    href?: string;
    /** Optional eyebrow/category shown above the title. */
    eyebrow?: string;
    /**
     * Optional slot rendered on the right of the header (e.g. a badge or
     * a status chip).
     */
    headerRight?: React.ReactNode;
    /** Hide the chevron that appears on hover. */
    hideArrow?: boolean;
  };

/**
 * Modern stat card used by the dashboard.
 *
 * Layout:
 *   ┌────────────────────────────────────┐
 *   │ [icon]  Title           [chip]     │  ← header
 *   │         eyebrow                    │
 *   │                                    │
 *   │   1,234  total                     │  ← main value (children)
 *   │                                    │
 *   │   [secondary metrics]              │  ← footer (children)
 *   └────────────────────────────────────┘
 *
 * Use `children` to render the main value, secondary stats, progress bars,
 * sparklines, etc.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    { className, icon: Icon, title, href, eyebrow, headerRight, hideArrow = false, tone = 'brand', children, ...props },
    ref,
  ) => {
    const iconToneClass = (() => {
      switch (tone) {
        case 'info':
          return 'icon-tile-info';
        case 'success':
          return 'icon-tile-success';
        case 'warning':
          return 'icon-tile-warning';
        case 'neutral':
          return 'icon-tile-neutral';
        case 'brand':
        default:
          return 'icon-tile-brand';
      }
    })();

    const titleNode = (
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-0.5 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">{eyebrow}</p>
        )}
        <h2 className="truncate font-semibold text-[15px] text-foreground leading-tight tracking-tight">{title}</h2>
      </div>
    );

    return (
      <div ref={ref} className={cn(statCardVariants({ tone }), className)} {...props}>
        <div className="flex items-start gap-3">
          {Icon && (
            <span className={cn('icon-tile', iconToneClass)} aria-hidden>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
          )}

          {href ? (
            <Slot
              className={cn(
                'group/link flex min-w-0 flex-1 items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              )}
            >
              <a href={href} className="flex min-w-0 flex-1 items-center gap-2 outline-none" aria-label={title}>
                {titleNode}
                {!hideArrow && (
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-focus-within/stat:opacity-100 group-hover/stat:translate-x-0.5 group-hover/stat:-translate-y-0.5 group-hover/stat:opacity-100"
                    aria-hidden
                  />
                )}
              </a>
            </Slot>
          ) : (
            titleNode
          )}

          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>

        <div className="mt-5 flex flex-col gap-4">{children}</div>
      </div>
    );
  },
);

StatCard.displayName = 'StatCard';

const StatCardValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-bold text-3xl text-foreground tabular-nums leading-none tracking-tight', className)}
      {...props}
    />
  ),
);

StatCardValue.displayName = 'StatCardValue';

const StatCardLabel = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('ml-2 pb-0.5 text-muted-foreground text-sm', className)} {...props} />
  ),
);

StatCardLabel.displayName = 'StatCardLabel';

const StatCardDivider = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn('-mx-1 h-px border-0 bg-border/70', className)} {...props} />
  ),
);

StatCardDivider.displayName = 'StatCardDivider';

const StatSubGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('grid grid-cols-3 gap-2', className)} {...props} />,
);

StatSubGrid.displayName = 'StatSubGrid';

const StatSubItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5', className)}
      {...props}
    />
  ),
);

StatSubItem.displayName = 'StatSubItem';

const StatSubItemLabel = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]', className)}
      {...props}
    />
  ),
);

StatSubItemLabel.displayName = 'StatSubItemLabel';

const StatSubItemValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-semibold text-foreground text-lg tabular-nums leading-none tracking-tight', className)}
      {...props}
    />
  ),
);

StatSubItemValue.displayName = 'StatSubItemValue';

export {
  StatCard,
  StatCardDivider,
  StatCardLabel,
  StatCardValue,
  StatSubGrid,
  StatSubItem,
  StatSubItemLabel,
  StatSubItemValue,
};
