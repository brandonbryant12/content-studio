import type { ReactNode } from 'react';

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary */
  resetErrorBoundary: () => void;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

export interface ErrorBoundaryProps {
  /** Content to render */
  children: ReactNode;
  /** Custom fallback component */
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Called when boundary is reset */
  onReset?: () => void;
  /** Keys that trigger reset when changed */
  resetKeys?: unknown[];
}
