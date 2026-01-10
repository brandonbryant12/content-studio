// features/infographics/components/infographic-detail-container.tsx

import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';

import {
  useInfographic,
  useInfographicSettings,
  useSelections,
  useGenerateInfographic,
  useAddSelection,
  useRemoveSelection,
  useReorderSelections,
  useExtractKeyPoints,
  type KeyPointSuggestion,
} from '../hooks';
import { isGeneratingStatus, type InfographicStatusType } from '../lib/status';
import {
  InfographicWorkbenchLayout,
  InfographicActionBar,
  DocumentContentPanel,
  TextHighlighter,
  SelectionList,
  AISuggestionsPanel,
  SettingsPanel,
  PreviewPanel,
  type InfographicDocumentInfo,
  type ExistingSelection,
  type SelectionListItem,
} from './workbench';
import { apiClient } from '@/clients/apiClient';
import { useDocuments } from '@/features/documents';
import { useKeyboardShortcut, useNavigationBlock } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';

type Infographic = RouterOutput['infographics']['get'];
type Selection = Infographic['selections'][number];

interface InfographicDetailContainerProps {
  infographicId: string;
}

/**
 * Container: Fetches infographic data and coordinates all state/mutations.
 * Renders InfographicWorkbenchLayout with document panels, settings, and preview.
 */
export function InfographicDetailContainer({
  infographicId,
}: InfographicDetailContainerProps) {
  const navigate = useNavigate();

  // Data fetching (Suspense handles loading)
  const { data: infographic } = useInfographic(infographicId);

  // Fetch all documents to get details for source document IDs
  const { data: allDocuments } = useDocuments({ enabled: true });

  // Local state management
  const settings = useInfographicSettings({ infographic });
  const selectionState = useSelections({
    initialSelections: [...(infographic?.selections ?? [])] as Selection[],
  });

  // Generation hook
  const {
    generate,
    isGenerating,
    error: generationError,
  } = useGenerateInfographic(infographicId);

  // Selection mutations
  const addSelection = useAddSelection(infographicId);
  const removeSelection = useRemoveSelection(infographicId);
  const reorderSelectionsMutation = useReorderSelections(infographicId);

  // AI extraction hook
  const extractKeyPointsMutation = useExtractKeyPoints();
  const [suggestions, setSuggestions] = useState<KeyPointSuggestion[]>([]);

  // Delete mutation
  const deleteMutation = useMutation(
    apiClient.infographics.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Infographic deleted');
        navigate({ to: '/infographics' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete infographic'));
      },
    }),
  );

  // Document state (documents currently shown in workbench)
  const [workbenchDocuments, setWorkbenchDocuments] = useState<
    InfographicDocumentInfo[]
  >([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const hasInitializedDocsRef = useRef(false);

  // Initialize documents from infographic's source document IDs
  // This effect runs once when data becomes available to sync server data to local state
  useEffect(() => {
    if (
      hasInitializedDocsRef.current ||
      !infographic?.sourceDocumentIds ||
      !allDocuments ||
      allDocuments.length === 0
    ) {
      return;
    }

    const docs: InfographicDocumentInfo[] = [];
    for (const docId of infographic.sourceDocumentIds) {
      const doc = allDocuments.find((d) => d.id === docId);
      if (doc) {
        docs.push({
          id: doc.id,
          title: doc.title,
          wordCount: doc.wordCount,
          mimeType: doc.mimeType,
        });
      }
    }
    if (docs.length > 0) {
      hasInitializedDocsRef.current = true;
      setWorkbenchDocuments(docs);
      setActiveDocumentId(docs[0]?.id ?? null);
    }
  }, [infographic?.sourceDocumentIds, allDocuments]);

  // Get current document content for text highlighter
  const activeDocument = workbenchDocuments.find(
    (d) => d.id === activeDocumentId,
  );
  const { data: documentContent } = useQuery({
    ...apiClient.documents.getContent.queryOptions({
      input: { id: activeDocumentId ?? '' },
    }),
    enabled: !!activeDocumentId,
  });

  // Computed state
  const hasAnyChanges = settings.hasChanges || selectionState.hasChanges;
  const isInfographicGenerating =
    isGeneratingStatus(infographic?.status) || isGenerating;
  const hasGenerated = !!infographic?.imageUrl;

  // Build document title map for AI suggestions panel
  const documentTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    for (const doc of workbenchDocuments) {
      titles[doc.id] = doc.title;
    }
    return titles;
  }, [workbenchDocuments]);

  // Get existing selections for current document with offsets
  const existingSelectionsForDocument = useMemo((): ExistingSelection[] => {
    if (!activeDocumentId) return [];
    return selectionState.selections
      .filter((s) => s.documentId === activeDocumentId)
      .map((s) => ({
        id: s.id,
        selectedText: s.selectedText,
        startOffset: s.startOffset ?? 0,
        endOffset: s.endOffset ?? s.selectedText.length,
      }));
  }, [activeDocumentId, selectionState.selections]);

  // Build selection list items for the selection list component
  const selectionListItems = useMemo((): SelectionListItem[] => {
    return [...selectionState.selections]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => ({
        id: s.id,
        selectedText: s.selectedText,
        documentTitle: documentTitles[s.documentId] ?? 'Unknown',
        orderIndex: s.orderIndex,
      }));
  }, [selectionState.selections, documentTitles]);

  // Save handler - saves settings and selection order
  const handleSave = useCallback(async () => {
    if (settings.isSaving || reorderSelectionsMutation.isPending) {
      return;
    }

    try {
      if (settings.hasChanges) {
        await settings.saveSettings();
      }
      if (selectionState.hasChanges) {
        await reorderSelectionsMutation.mutateAsync({
          id: infographicId,
          orderedSelectionIds:
            selectionState.selectionIds as (typeof selectionState.selectionIds)[number][],
        });
      }
      toast.success('Changes saved');
    } catch {
      // Errors handled by mutations
    }
  }, [infographicId, settings, selectionState, reorderSelectionsMutation]);

  // Generate handler
  const handleGenerate = useCallback(() => {
    generate(settings.feedbackInstructions ?? undefined);
  }, [generate, settings.feedbackInstructions]);

  // Delete handler
  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: infographicId });
  }, [deleteMutation, infographicId]);

  // Selection handlers
  const handleAddSelection = useCallback(
    (selection: { text: string; startOffset: number; endOffset: number }) => {
      if (!activeDocumentId) return;

      addSelection.mutate({
        id: infographicId,
        documentId: activeDocumentId,
        selectedText: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
      });
    },
    [addSelection, infographicId, activeDocumentId],
  );

  const handleRemoveSelection = useCallback(
    (selectionId: string) => {
      removeSelection.mutate({
        id: infographicId,
        selectionId,
      });
    },
    [removeSelection, infographicId],
  );

  const handleReorderSelections = useCallback(
    (orderedIds: string[]) => {
      selectionState.reorderSelections(
        orderedIds as (typeof selectionState.selectionIds)[number][],
      );
    },
    [selectionState],
  );

  // Document handlers
  const handleAddDocuments = useCallback((docs: InfographicDocumentInfo[]) => {
    setWorkbenchDocuments((prev) => [...prev, ...docs]);
    // If no active document, select the first new one
    setActiveDocumentId((current) => current ?? docs[0]?.id ?? null);
  }, []);

  const handleRemoveDocument = useCallback(
    (documentId: string) => {
      setWorkbenchDocuments((prev) => {
        const newDocs = prev.filter((d) => d.id !== documentId);
        // If removing the active document, select another
        if (activeDocumentId === documentId) {
          setActiveDocumentId(newDocs[0]?.id ?? null);
        }
        return newDocs;
      });
    },
    [activeDocumentId],
  );

  // AI extraction handlers
  const handleExtract = useCallback(() => {
    if (!infographicId) return;

    extractKeyPointsMutation.mutate(
      { id: infographicId },
      {
        onSuccess: (data) => {
          setSuggestions([...data.suggestions]);
        },
      },
    );
  }, [infographicId, extractKeyPointsMutation]);

  const handleAddSuggestion = useCallback(
    (suggestion: KeyPointSuggestion) => {
      addSelection.mutate({
        id: infographicId,
        documentId: suggestion.documentId,
        selectedText: suggestion.text,
      });
      // Remove from suggestions list
      setSuggestions((prev) => prev.filter((s) => s.text !== suggestion.text));
    },
    [addSelection, infographicId],
  );

  const handleAddAllHighRelevance = useCallback(() => {
    const highSuggestions = suggestions.filter((s) => s.relevance === 'high');
    for (const suggestion of highSuggestions) {
      addSelection.mutate({
        id: infographicId,
        documentId: suggestion.documentId,
        selectedText: suggestion.text,
      });
    }
    // Remove added suggestions
    setSuggestions((prev) => prev.filter((s) => s.relevance !== 'high'));
  }, [suggestions, addSelection, infographicId]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
    enabled: hasAnyChanges,
  });

  // Block navigation if there are unsaved changes
  useNavigationBlock({
    shouldBlock: hasAnyChanges,
  });

  // Left panel: document content with text highlighter and selection list
  const leftPanel = (
    <div className="flex flex-col h-full">
      {/* Document content panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DocumentContentPanel
          documents={workbenchDocuments}
          activeDocumentId={activeDocumentId}
          onActiveDocumentChange={setActiveDocumentId}
          onAddDocument={handleAddDocuments}
          onRemoveDocument={handleRemoveDocument}
          disabled={isInfographicGenerating}
        >
          {documentContent?.content && activeDocument && (
            <TextHighlighter
              content={documentContent.content}
              existingSelections={existingSelectionsForDocument}
              onAddSelection={handleAddSelection}
              onRemoveSelection={handleRemoveSelection}
              disabled={isInfographicGenerating}
            />
          )}
        </DocumentContentPanel>
      </div>

      {/* AI suggestions panel */}
      <div className="shrink-0 border-t border-border">
        <AISuggestionsPanel
          documentIds={workbenchDocuments.map((d) => d.id)}
          onExtract={handleExtract}
          isExtracting={extractKeyPointsMutation.isPending}
          suggestions={suggestions}
          onAddSuggestion={handleAddSuggestion}
          onAddAllHigh={handleAddAllHighRelevance}
          documentTitles={documentTitles}
          disabled={isInfographicGenerating}
        />
      </div>

      {/* Selection list */}
      <div className="shrink-0 border-t border-border max-h-64 overflow-y-auto">
        <SelectionList
          selections={selectionListItems}
          onRemove={handleRemoveSelection}
          onReorder={handleReorderSelections}
          disabled={isInfographicGenerating}
        />
      </div>
    </div>
  );

  // Right panel: settings and preview
  const rightPanel = (
    <div className="flex flex-col h-full">
      {/* Settings panel */}
      <div className="shrink-0 border-b border-border overflow-y-auto max-h-[50%]">
        <SettingsPanel
          settings={settings}
          hasGenerated={hasGenerated}
          disabled={isInfographicGenerating}
        />
      </div>

      {/* Preview panel */}
      <div className="flex-1 min-h-0">
        <PreviewPanel
          imageUrl={infographic?.imageUrl ?? null}
          status={infographic?.status as InfographicStatusType}
          errorMessage={generationError}
          title={infographic?.title ?? 'Infographic'}
        />
      </div>
    </div>
  );

  // Action bar
  const actionBar = (
    <InfographicActionBar
      status={infographic?.status as InfographicStatusType | undefined}
      isGenerating={isInfographicGenerating}
      hasChanges={hasAnyChanges}
      isSaving={settings.isSaving || reorderSelectionsMutation.isPending}
      onSave={handleSave}
      onGenerate={handleGenerate}
      disabled={isInfographicGenerating}
    />
  );

  return (
    <InfographicWorkbenchLayout
      infographic={infographic}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      actionBar={actionBar}
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
    />
  );
}
