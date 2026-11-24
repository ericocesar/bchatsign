import type { ImageLoadingState } from '@bchatsign/lib/client-only/providers/envelope-render-provider';
import { cn } from '@bchatsign/ui/lib/utils';
import { Spinner } from '@bchatsign/ui/primitives/spinner';
import { Trans } from '@lingui/react/macro';

type PdfViewerPageImageProps = {
  imageLoadingState: ImageLoadingState;

  /**
   * Whether the page and everything drawn on it are ready to be shown.
   */
  isPageReady: boolean;

  imageProps: React.ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown> & { alt: '' };
};

export const PdfViewerPageImage = ({ imageLoadingState, isPageReady, imageProps }: PdfViewerPageImageProps) => {
  const isLoading = !isPageReady && imageLoadingState !== 'error';

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center text-muted-foreground opacity-20"
          data-testid="page-loader"
        >
          <Spinner />
        </div>
      )}

      {imageLoadingState === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p>
            <Trans>Error loading page</Trans>
          </p>
        </div>
      )}

      {/* The PDF image. */}
      {imageProps.src && (
        <img
          {...imageProps}
          className={cn(imageProps.className, 'select-none', !isPageReady && 'invisible')}
          draggable={false}
          alt=""
        />
      )}
    </>
  );
};
