import { useMemo } from 'react';

import { cn } from '../lib/utils';

export type MiniBarsProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Values to render. Each value is normalized against the maximum to compute
   * its height, so values can be any positive number.
   */
  values: number[];
  /**
   * Number of bars to show. If `values` is shorter, it is padded with zeros.
   * If it is longer, it is trimmed.
   */
  count?: number;
  /**
   * Optional index of the most recent bar to highlight.
   * Defaults to the last bar.
   */
  activeIndex?: number;
};

/**
 * Tiny bar chart used as a sparkline replacement inside stat cards. It is
 * purely decorative — it does not render text or labels, only vertical bars
 * that hint at a trend. Consumers should provide an `aria-label` to describe
 * the underlying trend to assistive tech.
 */
export const MiniBars = ({ values, count, activeIndex, className, ...props }: MiniBarsProps) => {
  const bars = useMemo(() => {
    const total = count ?? values.length ?? 8;
    const source = values.slice(-total);
    while (source.length < total) {
      source.unshift(0);
    }

    const max = Math.max(...source, 1);

    return source.map((value, index) => ({
      key: index,
      height: Math.max(8, Math.round((value / max) * 100)),
      active: index === (activeIndex ?? source.length - 1),
    }));
  }, [values, count, activeIndex]);

  return (
    <div role="img" className={cn('mini-bars', className)} aria-hidden {...props}>
      {bars.map((bar) => (
        <span key={bar.key} data-active={bar.active} style={{ height: `${bar.height}%` }} />
      ))}
    </div>
  );
};
