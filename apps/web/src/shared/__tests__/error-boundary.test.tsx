import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';
import type { ErrorBoundaryProps } from '../components/error-boundary/types';
import { renderWithQuery, screen, fireEvent } from '@/test-utils';

function ThrowingComponent({ error }: { error: Error }): never {
  throw error;
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function renderBoundary(
  children: ReactNode,
  props: Partial<ErrorBoundaryProps> = {},
) {
  return renderWithQuery(<ErrorBoundary {...props}>{children}</ErrorBoundary>);
}

function createRecoverableComponent(error: Error, recoveredText: string) {
  let shouldThrow = true;

  function RecoverableComponent() {
    if (shouldThrow) {
      throw error;
    }
    return <div>{recoveredText}</div>;
  }

  return {
    RecoverableComponent,
    recover: () => {
      shouldThrow = false;
    },
  };
}

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    renderBoundary(<div>Test Content</div>);

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows error fallback when child throws error', () => {
    const testError = new Error('Test error message');

    renderBoundary(<ThrowingComponent error={testError} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('shows custom fallback component when provided', () => {
    const testError = new Error('Custom error');

    function CustomFallback({
      error,
      resetErrorBoundary,
    }: {
      error: Error;
      resetErrorBoundary: () => void;
    }) {
      return (
        <div>
          <span>Custom Error: {error.message}</span>
          <button onClick={resetErrorBoundary}>Custom Reset</button>
        </div>
      );
    }

    renderBoundary(<ThrowingComponent error={testError} />, {
      FallbackComponent: CustomFallback,
    });

    expect(screen.getByText('Custom Error: Custom error')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /custom reset/i }),
    ).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const testError = new Error('Callback test error');
    const onError = vi.fn();

    renderBoundary(<ThrowingComponent error={testError} />, { onError });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it('reset button clears error state and calls onReset', () => {
    const testError = new Error('Reset test error');
    const onReset = vi.fn();
    const { RecoverableComponent, recover } = createRecoverableComponent(
      testError,
      'Recovered Content',
    );

    renderBoundary(<RecoverableComponent />, { onReset });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    recover();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Recovered Content')).toBeInTheDocument();
  });

  it('changes in resetKeys triggers reset', () => {
    const testError = new Error('Reset keys test error');
    const onReset = vi.fn();
    const { RecoverableComponent, recover } = createRecoverableComponent(
      testError,
      'Recovered via Reset Keys',
    );

    const { rerender } = renderBoundary(<RecoverableComponent />, {
      onReset,
      resetKeys: ['key1'],
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    recover();
    rerender(
      <ErrorBoundary onReset={onReset} resetKeys={['key2']}>
        <RecoverableComponent />
      </ErrorBoundary>,
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Recovered via Reset Keys')).toBeInTheDocument();
  });
});
