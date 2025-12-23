import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import type { RouterOutput } from '@repo/api/client';

type PodcastScript = RouterOutput['podcasts']['getScript'];

interface UseVersionViewerOptions {
  podcastId: string;
  activeScript: PodcastScript | null;
  selectedScriptId: string | undefined;
}

export interface UseVersionViewerReturn {
  /** The script currently being viewed (active or historical) */
  viewedScript: PodcastScript | null;
  /** Whether we're viewing a historical (non-active) version */
  isViewingHistory: boolean;
  /** Whether the viewed script is editable (only active version is) */
  isEditable: boolean;
  /** Loading state for fetching historical script */
  isLoadingScript: boolean;
  /** Select a specific script version to view */
  selectVersion: (scriptId: string | null) => void;
  /** Clear selection and go back to active version */
  clearSelection: () => void;
}

export function useVersionViewer({
  podcastId,
  activeScript,
  selectedScriptId,
}: UseVersionViewerOptions): UseVersionViewerReturn {
  const navigate = useNavigate();

  // Determine if we need to fetch a historical script
  const shouldFetchHistorical =
    selectedScriptId && activeScript && selectedScriptId !== activeScript.id;

  // Fetch the selected historical script if not the active one
  const {
    data: historicalScript,
    isPending: isLoadingScript,
    error: scriptError,
  } = useQuery({
    ...apiClient.podcasts.getScriptVersion.queryOptions({
      input: { id: podcastId, scriptId: selectedScriptId! },
    }),
    enabled: !!shouldFetchHistorical,
  });

  // Clear selection if script fetch fails
  useEffect(() => {
    if (scriptError && selectedScriptId) {
      toast.error('Script version not found');
      navigate({
        to: '/podcasts/$podcastId',
        params: { podcastId },
        search: { scriptId: undefined },
        replace: true,
      });
    }
  }, [scriptError, selectedScriptId, navigate, podcastId]);

  const viewedScript = useMemo(() => {
    if (!selectedScriptId || !activeScript) {
      return activeScript;
    }
    if (selectedScriptId === activeScript.id) {
      return activeScript;
    }
    return historicalScript ?? null;
  }, [selectedScriptId, activeScript, historicalScript]);

  const isViewingHistory = !!(
    viewedScript &&
    activeScript &&
    viewedScript.id !== activeScript.id
  );

  const isEditable = !isViewingHistory;

  const selectVersion = useCallback(
    (scriptId: string | null) => {
      navigate({
        to: '/podcasts/$podcastId',
        params: { podcastId },
        search: { scriptId: scriptId ?? undefined },
        replace: true,
      });
    },
    [navigate, podcastId],
  );

  const clearSelection = useCallback(() => {
    selectVersion(null);
  }, [selectVersion]);

  return {
    viewedScript,
    isViewingHistory,
    isEditable,
    isLoadingScript: shouldFetchHistorical ? isLoadingScript : false,
    selectVersion,
    clearSelection,
  };
}
