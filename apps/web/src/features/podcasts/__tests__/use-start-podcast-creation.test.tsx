import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStartPodcastCreation } from '../hooks/use-start-podcast-creation';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

describe('useStartPodcastCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the draftless setup route', async () => {
    const { result } = renderHook(() => useStartPodcastCreation());

    await act(async () => {
      result.current.start();
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith({ to: '/podcasts/new' });
  });
});
