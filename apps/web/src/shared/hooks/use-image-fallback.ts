import { useCallback, useMemo, useState } from 'react';

export function useImageFallback(src: string | null) {
  const sourceToken = useMemo(() => Symbol(src ?? 'image-fallback'), [src]);
  const [failedSourceToken, setFailedSourceToken] = useState<symbol | null>(
    null,
  );
  const hasError = src !== null && failedSourceToken === sourceToken;

  const handleError = useCallback(() => {
    if (src === null) {
      return;
    }

    setFailedSourceToken(sourceToken);
  }, [sourceToken, src]);

  return {
    src: hasError ? null : src,
    hasError,
    onError: handleError,
  } as const;
}
