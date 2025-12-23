import { useRef, useEffect } from 'react';

/**
 * Hook that returns the previous value of a variable.
 * Useful for detecting changes and transitions between states.
 *
 * Note: Accessing ref.current during render is intentional here -
 * this is the standard usePrevious pattern that stores the previous
 * value in a ref and reads it before the effect updates it.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs -- Standard usePrevious pattern
  return ref.current;
}
