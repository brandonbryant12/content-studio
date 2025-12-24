import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type PodcastScript = RouterOutput['podcasts']['getScript'];

interface UseVersionViewerOptions {
  podcastId: string;
  activeScript: PodcastScript | null;
  selectedVersion: number | undefined;
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
  selectVersion: (version: number | null) => void;
  /** Clear selection and go back to active version */
  clearSelection: () => void;
}

export function useVersionViewer({
  podcastId,
  activeScript,
  selectedVersion,
}: UseVersionViewerOptions): UseVersionViewerReturn {
  const navigate = useNavigate();

  // Fetch versions list to resolve version number -> scriptId
  const { data: versions } = useQuery({
    ...apiClient.podcasts.listScriptVersions.queryOptions({
      input: { id: podcastId },
    }),
    // Only enable when we need to look up a version
    enabled: selectedVersion !== undefined,
    refetchOnMount: 'always',
  });

  // Resolve version number to scriptId
  const resolvedScriptId = useMemo(() => {
    if (selectedVersion === undefined) return undefined;

    // If selected version matches active script, use that
    if (activeScript && activeScript.version === selectedVersion) {
      return activeScript.id;
    }

    // Look up in versions list
    const versionEntry = versions?.find((v) => v.version === selectedVersion);
    return versionEntry?.id;
  }, [selectedVersion, activeScript, versions]);

  // Determine if we need to fetch a historical script
  const shouldFetchHistorical =
    resolvedScriptId && activeScript && resolvedScriptId !== activeScript.id;

  // Fetch the selected historical script if not the active one
  const {
    data: historicalScript,
    isPending: isLoadingScript,
    error: scriptError,
  } = useQuery({
    ...apiClient.podcasts.getScriptVersion.queryOptions({
      input: { id: podcastId, scriptId: resolvedScriptId! },
    }),
    enabled: !!shouldFetchHistorical,
  });

  // Clear selection if script fetch fails or version not found
  useEffect(() => {
    if (selectedVersion !== undefined) {
      // Version not found in list (and list is loaded)
      const versionNotFound =
        versions && !versions.find((v) => v.version === selectedVersion);

      if (scriptError || versionNotFound) {
        toast.error('Script version not found');
        navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId },
          search: { version: undefined },
          replace: true,
        });
      }
    }
  }, [scriptError, selectedVersion, versions, navigate, podcastId]);

  const viewedScript = useMemo(() => {
    if (selectedVersion === undefined || !activeScript) {
      return activeScript;
    }
    if (activeScript.version === selectedVersion) {
      return activeScript;
    }
    return historicalScript ?? null;
  }, [selectedVersion, activeScript, historicalScript]);

  const isViewingHistory = !!(
    viewedScript &&
    activeScript &&
    viewedScript.id !== activeScript.id
  );

  const isEditable = !isViewingHistory;

  const selectVersion = useCallback(
    (version: number | null) => {
      navigate({
        to: '/podcasts/$podcastId',
        params: { podcastId },
        search: { version: version ?? undefined },
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
