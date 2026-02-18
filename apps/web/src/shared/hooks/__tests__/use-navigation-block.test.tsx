import { useBlocker } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationBlock } from '../use-navigation-block';

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(),
}));

describe('useNavigationBlock', () => {
  const getBlockerConfig = () =>
    vi.mocked(useBlocker).mock.calls[0]?.[0] as
      | { shouldBlockFn: () => boolean }
      | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks in-app navigation when user cancels the unsaved-changes warning', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderHook(() => useNavigationBlock({ shouldBlock: true }));

    const config = getBlockerConfig();
    expect(config).toBeDefined();

    expect(config?.shouldBlockFn()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. If you leave this page, your changes will be lost.',
    );
  });

  it('allows in-app navigation when user confirms leaving', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderHook(() => useNavigationBlock({ shouldBlock: true }));

    const config = getBlockerConfig();
    expect(config?.shouldBlockFn()).toBe(false);
  });

  it('does not prompt when blocking is disabled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    renderHook(() => useNavigationBlock({ shouldBlock: false }));

    const config = getBlockerConfig();
    expect(config?.shouldBlockFn()).toBe(false);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('uses a custom confirm message when provided', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderHook(() =>
      useNavigationBlock({
        shouldBlock: true,
        confirmMessage: 'Custom unsaved changes warning',
      }),
    );

    const config = getBlockerConfig();
    expect(config?.shouldBlockFn()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('Custom unsaved changes warning');
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
