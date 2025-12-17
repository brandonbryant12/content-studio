import type { PodcastStatus } from '../-constants/status';

export function PodcastIcon({
  format,
  status,
}: {
  format: 'voice_over' | 'conversation';
  status: PodcastStatus;
}) {
  const isReady = status === 'ready';
  const bgColor = isReady
    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
    : 'bg-gray-100 dark:bg-gray-800';
  const iconColor = isReady ? 'text-white' : 'text-gray-500 dark:text-gray-400';

  return (
    <div
      className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shadow-sm`}
    >
      {format === 'conversation' ? (
        <svg
          className={`w-6 h-6 ${iconColor}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ) : (
        <svg
          className={`w-6 h-6 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      )}
    </div>
  );
}
