import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingDismissed } from '../use-onboarding-dismissed';

describe('useOnboardingDismissed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to not dismissed', () => {
    const { result } = renderHook(() => useOnboardingDismissed());
    expect(result.current.isDismissed).toBe(false);
  });

  it('dismiss() sets isDismissed to true and persists to localStorage', () => {
    const { result } = renderHook(() => useOnboardingDismissed());

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(localStorage.getItem('onboarding-dismissed')).toBe('true');
  });

  it('handles localStorage errors gracefully', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    const { result } = renderHook(() => useOnboardingDismissed());

    act(() => {
      result.current.dismiss();
    });

    // In-memory state should still update
    expect(result.current.isDismissed).toBe(true);
    setItemSpy.mockRestore();
  });
});
