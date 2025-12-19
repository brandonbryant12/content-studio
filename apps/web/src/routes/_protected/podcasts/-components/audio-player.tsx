export function AudioPlayer({ url }: { url: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-100/80 via-fuchsia-50/60 to-violet-50/40 dark:from-violet-950/50 dark:via-fuchsia-950/30 dark:to-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 shadow-sm">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="audio-wave" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 Q10 5 20 10 T40 10" stroke="currentColor" fill="none" strokeWidth="1.5" className="text-violet-900 dark:text-violet-100" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#audio-wave)" />
        </svg>
      </div>

      <div className="relative p-4">
        <audio
          controls
          className="w-full h-10 [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-current-time-display]:text-violet-700 [&::-webkit-media-controls-time-remaining-display]:text-violet-600 dark:[&::-webkit-media-controls-current-time-display]:text-violet-300 dark:[&::-webkit-media-controls-time-remaining-display]:text-violet-400"
          src={url}
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}
