import { Spinner } from '@repo/ui/components/spinner';
import type { VersionStatus } from '../-constants/status';
import { getStatusConfig, isGeneratingStatus } from '../-constants/status';

// Panel styling for StatusDisplay (different from Badge variants)
const statusPanelStyles: Record<
  VersionStatus,
  { color: string; bgColor: string; borderColor: string }
> = {
  draft: {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  script_ready: {
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  generating_audio: {
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-50 dark:bg-violet-950/50',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
  audio_ready: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  failed: {
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

const defaultPanelStyle = {
  color: 'text-gray-700 dark:text-gray-300',
  bgColor: 'bg-gray-50 dark:bg-gray-900',
  borderColor: 'border-gray-200 dark:border-gray-800',
};

export function StatusDisplay({
  status,
  errorMessage,
}: {
  status: VersionStatus | undefined;
  errorMessage?: string | null;
}) {
  const panelStyle = status ? statusPanelStyles[status] : defaultPanelStyle;
  const statusConfig = getStatusConfig(status);
  const isGenerating = isGeneratingStatus(status);
  const isReady = status === 'audio_ready';
  const isFailed = status === 'failed';

  return (
    <div
      className={`p-4 rounded-xl border ${panelStyle.bgColor} ${panelStyle.borderColor}`}
    >
      <div className="flex items-center gap-3">
        {isGenerating && (
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Spinner className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        {isReady && (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
        {isFailed && (
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}
        <div>
          <p className={`font-medium ${panelStyle.color}`}>
            {statusConfig?.message ?? 'Unknown status'}
          </p>
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
