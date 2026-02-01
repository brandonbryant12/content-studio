// features/brands/components/brand-wizard/brand-error-fallback.tsx
// Brand-specific error fallback with retry and navigation options

import {
  ExclamationTriangleIcon,
  ReloadIcon,
  ArrowLeftIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useNavigate } from '@tanstack/react-router';
import type { ErrorFallbackProps } from '../../../../shared/components/error-boundary/types';

interface BrandErrorFallbackProps extends ErrorFallbackProps {
  /** Brand ID for navigation fallback */
  brandId?: string;
}

export function BrandErrorFallback({
  error,
  resetErrorBoundary,
  brandId,
  title = 'Something went wrong in the brand wizard',
  description,
}: BrandErrorFallbackProps) {
  const navigate = useNavigate();

  const handleReturnToBrands = () => {
    navigate({ to: '/brands' });
  };

  const handleReturnToBrand = () => {
    if (brandId) {
      navigate({
        to: '/brands/$brandId',
        params: { brandId },
        search: { step: undefined },
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        {description ??
          error.message ??
          'An unexpected error occurred while editing your brand.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={resetErrorBoundary} variant="outline">
          <ReloadIcon className="w-4 h-4 mr-2" />
          Try Again
        </Button>

        {brandId && (
          <Button onClick={handleReturnToBrand} variant="ghost">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Return to Brand
          </Button>
        )}

        <Button onClick={handleReturnToBrands} variant="ghost">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Brands
        </Button>
      </div>

      {import.meta.env.DEV && (
        <pre className="mt-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-left text-xs overflow-auto max-w-full max-h-48 text-gray-700 dark:text-gray-300">
          {error.stack}
        </pre>
      )}
    </div>
  );
}
