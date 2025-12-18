import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import type { ErrorFallbackProps } from './types';

export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
        {description ?? error.message ?? 'An unexpected error occurred.'}
      </p>

      <Button onClick={resetErrorBoundary} variant="outline">
        <ReloadIcon className="w-4 h-4 mr-2" />
        Try Again
      </Button>

      {import.meta.env.DEV && (
        <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-left text-xs overflow-auto max-w-full max-h-48 text-gray-700 dark:text-gray-300">
          {error.stack}
        </pre>
      )}
    </div>
  );
}
