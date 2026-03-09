import { useBlocker } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationBlock } from '../use-navigation-block';

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(),
}));

describe('useNavigationBlock', () => {
  const mockUseBlocker = vi.mocked(useBlocker);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: idle state
    mockUseBlocker.mockReturnValue({
      status: 'idle',
      current: undefined,
      next: undefined,
      action: undefined,
      proceed: undefined,
      reset: undefined,
    } as ReturnType<typeof useBlocker>);
  });

  it('passes shouldBlock and withResolver to useBlocker', () => {
    renderHook(() => useNavigationBlock({ shouldBlock: true }));

    expect(mockUseBlocker).toHaveBeenCalledWith({
      shouldBlockFn: expect.any(Function),
      withResolver: true,
    });
  });

  it('returns idle blocker when not blocked', () => {
    const { result } = renderHook(() =>
      useNavigationBlock({ shouldBlock: false }),
    );

    expect(result.current.isBlocked).toBe(false);
  });

  it('returns blocked state with proceed and reset when blocked', () => {
    const proceed = vi.fn();
    const reset = vi.fn();

    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      current: {} as never,
      next: {} as never,
      action: 'PUSH' as never,
      proceed,
      reset,
    } as unknown as ReturnType<typeof useBlocker>);

    const { result } = renderHook(() =>
      useNavigationBlock({ shouldBlock: true }),
    );

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.proceed).toBe(proceed);
    expect(result.current.reset).toBe(reset);
  });

  it('shouldBlockFn returns the shouldBlock value', () => {
    renderHook(() => useNavigationBlock({ shouldBlock: true }));

    const opts = mockUseBlocker.mock.calls[0]?.[0] as unknown as {
      shouldBlockFn: () => boolean;
    };
    expect(opts.shouldBlockFn()).toBe(true);
  });

  it('shouldBlockFn returns false when blocking is disabled', () => {
    renderHook(() => useNavigationBlock({ shouldBlock: false }));

    const opts = mockUseBlocker.mock.calls[0]?.[0] as unknown as {
      shouldBlockFn: () => boolean;
    };
    expect(opts.shouldBlockFn()).toBe(false);
  });

  it('registers and cleans beforeunload protection only while blocking', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = renderHook(
      ({ shouldBlock }: { shouldBlock: boolean }) =>
        useNavigationBlock({ shouldBlock }),
      { initialProps: { shouldBlock: true } },
    );

    const addCall = addSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload',
    );
    expect(addCall).toBeDefined();

    const handler = addCall?.[1] as (e: BeforeUnloadEvent) => void;
    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    handler(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');

    rerender({ shouldBlock: false });

    const removeCallAfterDisable = removeSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload' && call[1] === handler,
    );
    expect(removeCallAfterDisable).toBeDefined();

    unmount();
  });
});
