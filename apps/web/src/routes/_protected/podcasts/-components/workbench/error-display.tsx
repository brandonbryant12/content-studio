import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <section>
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
              Generation Failed
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
