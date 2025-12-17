export function ScriptViewer({
  segments,
  summary,
}: {
  segments: Array<{ speaker: string; line: string; index: number }>;
  summary?: string | null;
}) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        No script available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800 mb-4">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">
            Summary
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
        </div>
      )}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {segments.map((segment) => (
          <div key={segment.index} className="flex gap-4">
            <div className="w-20 shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                  segment.speaker.toLowerCase() === 'host'
                    ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                    : 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-300'
                }`}
              >
                {segment.speaker}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {segment.line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
