import { useMemo, useEffect, useRef } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { usePrevious } from './use-previous';
import { useScriptEditor, type ScriptSegment } from './use-script-editor';
import { useVersionViewer } from './use-version-viewer';

type PodcastFull = RouterOutput['podcasts']['get'];
type PodcastScript = RouterOutput['podcasts']['getScript'];

// Workbench modes
type WorkbenchMode =
  | { type: 'editing' }
  | { type: 'viewing_history'; version: number }
  | { type: 'generating' };

interface UsePodcastWorkbenchOptions {
  podcastId: string;
  podcast: PodcastFull | undefined;
  selectedScriptId: string | undefined;
}

export interface UsePodcastWorkbenchReturn {
  // Mode
  mode: WorkbenchMode;
  isEditing: boolean;
  isViewingHistory: boolean;
  isGenerating: boolean;

  // Display state (always correct for current mode)
  displaySegments: ScriptSegment[];
  displaySummary: string | null;

  // The script being viewed (active or historical)
  viewedScript: PodcastScript | null;
  viewedVersion: number | undefined;

  // Edit operations (safe to call in any mode - no-ops when not editing)
  editState: {
    hasChanges: boolean;
    isSaving: boolean;
    updateSegment: (index: number, data: Partial<ScriptSegment>) => void;
    addSegment: (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => void;
    removeSegment: (index: number) => void;
    reorderSegments: (fromIndex: number, toIndex: number) => void;
    saveChanges: () => void;
    discardChanges: () => void;
  };

  // Version navigation
  selectVersion: (scriptId: string | null) => void;
  clearSelection: () => void;
  isLoadingHistoricalScript: boolean;
}

/**
 * Unified hook for podcast workbench state management.
 *
 * Coordinates version viewing and script editing with proper mode awareness.
 * Fixes state sync bugs by:
 * 1. Only syncing editor when in editing mode AND active script ID changes
 * 2. Mode-aware display segments derivation
 * 3. Guarding status-based resets with mode checks
 */
export function usePodcastWorkbench({
  podcastId,
  podcast,
  selectedScriptId,
}: UsePodcastWorkbenchOptions): UsePodcastWorkbenchReturn {
  // Compose existing hooks
  const versionViewer = useVersionViewer({
    podcastId,
    activeScript: podcast?.script ?? null,
    selectedScriptId,
  });

  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: podcast?.script?.segments ?? [],
  });

  // Track the active script ID to detect real changes
  const activeScriptId = podcast?.script?.id;
  const prevActiveScriptIdRef = useRef<string | undefined>(activeScriptId);

  // Track previous status for detecting transitions
  const prevStatus = usePrevious(podcast?.status);

  // Determine the current mode
  const isGeneratingStatus =
    podcast?.status === 'generating_script' ||
    podcast?.status === 'generating_audio';

  const mode: WorkbenchMode = useMemo(() => {
    if (isGeneratingStatus) {
      return { type: 'generating' };
    }
    if (versionViewer.isViewingHistory && versionViewer.viewedScript) {
      return {
        type: 'viewing_history',
        version: versionViewer.viewedScript.version,
      };
    }
    return { type: 'editing' };
  }, [isGeneratingStatus, versionViewer.isViewingHistory, versionViewer.viewedScript]);

  // Mode-aware sync: Only sync editor when editing AND script ID actually changed
  useEffect(() => {
    if (
      mode.type === 'editing' &&
      activeScriptId !== undefined &&
      activeScriptId !== prevActiveScriptIdRef.current &&
      podcast?.script?.segments
    ) {
      scriptEditor.resetToSegments(podcast.script.segments);
      prevActiveScriptIdRef.current = activeScriptId;
    }
  }, [mode.type, activeScriptId, podcast?.script?.segments, scriptEditor]);

  // Handle initial load - sync editor on first render with valid data
  useEffect(() => {
    if (
      prevActiveScriptIdRef.current === undefined &&
      activeScriptId !== undefined &&
      podcast?.script?.segments
    ) {
      scriptEditor.resetToSegments(podcast.script.segments);
      prevActiveScriptIdRef.current = activeScriptId;
    }
  }, [activeScriptId, podcast?.script?.segments, scriptEditor]);

  // Mode-aware generation start reset: Only clear when transitioning INTO generating
  // AND not viewing history
  useEffect(() => {
    const isTransitioningToGenerating =
      prevStatus !== 'generating_script' &&
      podcast?.status === 'generating_script';

    if (mode.type !== 'viewing_history' && isTransitioningToGenerating) {
      scriptEditor.resetToSegments([]);
    }
  }, [mode.type, podcast?.status, prevStatus, scriptEditor]);

  // Derive display segments based on mode
  const displaySegments = useMemo((): ScriptSegment[] => {
    switch (mode.type) {
      case 'viewing_history':
        return versionViewer.viewedScript?.segments ?? [];
      case 'editing':
        return scriptEditor.segments;
      case 'generating':
        return [];
    }
  }, [mode.type, versionViewer.viewedScript?.segments, scriptEditor.segments]);

  // Derive display summary based on mode
  const displaySummary = useMemo((): string | null => {
    switch (mode.type) {
      case 'viewing_history':
        return versionViewer.viewedScript?.summary ?? null;
      case 'editing':
        return podcast?.script?.summary ?? null;
      case 'generating':
        return null;
    }
  }, [mode.type, versionViewer.viewedScript?.summary, podcast?.script?.summary]);

  // Convenience booleans
  const isEditing = mode.type === 'editing';
  const isViewingHistory = mode.type === 'viewing_history';
  const isGenerating = mode.type === 'generating';

  // Get viewed version number
  const viewedVersion =
    mode.type === 'viewing_history' ? mode.version : undefined;

  return {
    // Mode
    mode,
    isEditing,
    isViewingHistory,
    isGenerating,

    // Display state
    displaySegments,
    displaySummary,

    // Viewed script
    viewedScript: versionViewer.viewedScript,
    viewedVersion,

    // Edit state (operations are safe to call - editor handles internally)
    editState: {
      hasChanges: scriptEditor.hasChanges,
      isSaving: scriptEditor.isSaving,
      updateSegment: scriptEditor.updateSegment,
      addSegment: scriptEditor.addSegment,
      removeSegment: scriptEditor.removeSegment,
      reorderSegments: scriptEditor.reorderSegments,
      saveChanges: scriptEditor.saveChanges,
      discardChanges: scriptEditor.discardChanges,
    },

    // Version navigation
    selectVersion: versionViewer.selectVersion,
    clearSelection: versionViewer.clearSelection,
    isLoadingHistoricalScript: versionViewer.isLoadingScript,
  };
}
