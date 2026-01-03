// shared/__tests__/error-boundary.test.tsx

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithQuery, screen, fireEvent } from '@/test-utils';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';

// Component that throws an error when rendered
function ThrowingComponent({ error }: { error: Error }): never {
  throw error;
}

// Suppress React's error boundary console logs during tests
const consoleErrorSpy = vi.spyOn(console, 'error');

afterEach(() => {
  consoleErrorSpy.mockReset();
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    consoleErrorSpy.mockImplementation(() => {});

    renderWithQuery(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows error fallback when child throws error', () => {
    consoleErrorSpy.mockImplementation(() => {});

    const testError = new Error('Test error message');

    renderWithQuery(
      <ErrorBoundary>
        <ThrowingComponent error={testError} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows custom fallback component when provided', () => {
    consoleErrorSpy.mockImplementation(() => {});

    const testError = new Error('Custom error');

    function CustomFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
      return (
        <div>
          <span>Custom Error: {error.message}</span>
          <button onClick={resetErrorBoundary}>Custom Reset</button>
        </div>
      );
    }

    renderWithQuery(
      <ErrorBoundary FallbackComponent={CustomFallback}>
        <ThrowingComponent error={testError} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom Error: Custom error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom reset/i })).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    consoleErrorSpy.mockImplementation(() => {});

    const testError = new Error('Callback test error');
    const onError = vi.fn();

    renderWithQuery(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent error={testError} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(testError, expect.objectContaining({
      componentStack: expect.any(String),
    }));
  });

  it('reset button clears error state and calls onReset', () => {
    consoleErrorSpy.mockImplementation(() => {});

    const testError = new Error('Reset test error');
    const onReset = vi.fn();
    let shouldThrow = true;

    function ConditionalThrowingComponent() {
      if (shouldThrow) {
        throw testError;
      }
      return <div>Recovered Content</div>;
    }

    renderWithQuery(
      <ErrorBoundary onReset={onReset}>
        <ConditionalThrowingComponent />
      </ErrorBoundary>,
    );

    // Error fallback should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Set flag to not throw on next render
    shouldThrow = false;

    // Click reset button
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // onReset should have been called
    expect(onReset).toHaveBeenCalledTimes(1);

    // Content should now be rendered
    expect(screen.getByText('Recovered Content')).toBeInTheDocument();
  });

  it('changes in resetKeys triggers reset', () => {
    consoleErrorSpy.mockImplementation(() => {});

    const testError = new Error('Reset keys test error');
    const onReset = vi.fn();
    let shouldThrow = true;

    function ConditionalThrowingComponent() {
      if (shouldThrow) {
        throw testError;
      }
      return <div>Recovered via Reset Keys</div>;
    }

    const { rerender } = renderWithQuery(
      <ErrorBoundary onReset={onReset} resetKeys={['key1']}>
        <ConditionalThrowingComponent />
      </ErrorBoundary>,
    );

    // Error fallback should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Set flag to not throw on next render
    shouldThrow = false;

    // Rerender with changed resetKeys
    rerender(
      <ErrorBoundary onReset={onReset} resetKeys={['key2']}>
        <ConditionalThrowingComponent />
      </ErrorBoundary>,
    );

    // onReset should have been called
    expect(onReset).toHaveBeenCalledTimes(1);

    // Content should now be rendered
    expect(screen.getByText('Recovered via Reset Keys')).toBeInTheDocument();
  });
});
