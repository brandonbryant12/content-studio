import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { useApproveInfographic } from '../hooks/use-approve-infographic';
import { useInfographic } from '../hooks/use-infographic';
import { useInfographicActions } from '../hooks/use-infographic-actions';
import { useInfographicSettings } from '../hooks/use-infographic-settings';
import { useInfographicVersions } from '../hooks/use-infographic-versions';
import { ExportDropdown } from './export-dropdown';
import { FormatSelector } from './format-selector';
import { PreviewPanel } from './preview-panel';
import { PromptPanel } from './prompt-panel';
import { StyleSelector } from './style-selector';
import { TypeSelector } from './type-selector';
import { VersionHistoryStrip } from './version-history-strip';
import { useDocumentList } from '@/features/documents/hooks/use-document-list';
import { ApproveButton } from '@/shared/components/approval/approve-button';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { DocumentManager } from '@/shared/components/document-manager';
import {
  useSessionGuard,
  useKeyboardShortcut,
  useNavigationBlock,
  useDocumentSelection,
} from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { getStorageUrl } from '@/shared/lib/storage-url';

interface InfographicWorkbenchContainerProps {
  infographicId: string;
}

export function InfographicWorkbenchContainer({
  infographicId,
}: InfographicWorkbenchContainerProps) {
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';
  const isAdmin = useIsAdmin();

  const { data: infographic } = useInfographic(infographicId);
  const settings = useInfographicSettings({ infographic });

  const { approve, revoke } = useApproveInfographic(
    infographicId,
    currentUserId,
  );
  const isApproved = infographic.approvedBy !== null;
  const isApprovalPending = approve.isPending || revoke.isPending;

  // Document selection — resolve sourceDocumentIds to DocumentInfo objects
  const { data: allDocuments } = useDocumentList();
  const initialDocuments = useMemo(() => {
    const ids = infographic.sourceDocumentIds ?? [];
    if (ids.length === 0 || !allDocuments) return [];
    return allDocuments.filter((d) => ids.includes(d.id));
  }, [infographic.sourceDocumentIds, allDocuments]);

  const documentSelection = useDocumentSelection({ initialDocuments });

  const actions = useInfographicActions({
    infographicId,
    infographic,
    settings,
    documentSelection,
  });

  const { data: versions = [], isLoading: versionsLoading } =
    useInfographicVersions(infographicId);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Determine which image to show: selected version or current
  const selectedVersion = selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId)
    : null;

  const storageKey =
    selectedVersion?.imageStorageKey ?? infographic.imageStorageKey;
  const displayImageUrl = storageKey ? getStorageUrl(storageKey) : null;

  // Edit mode: once at least one version has been generated
  const hasExistingImage = infographic.imageStorageKey !== null;

  // Keyboard shortcuts
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasChanges,
  });

  useKeyboardShortcut({
    key: 'Enter',
    cmdOrCtrl: true,
    onTrigger: actions.handleGenerate,
    enabled: actions.hasPrompt && !actions.isGenerating,
  });

  useNavigationBlock({
    shouldBlock: actions.hasChanges,
  });

  const handleSelectVersion = useCallback((versionId: string) => {
    setSelectedVersionId((prev) => (prev === versionId ? null : versionId));
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    actions.handleDelete();
  }, [actions]);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Link
            to="/infographics"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to infographics"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold truncate flex-1">
            {infographic.title}
          </h1>
          <div className="flex items-center gap-2">
            <ApproveButton
              isApproved={isApproved}
              isAdmin={isAdmin}
              onApprove={() => approve.mutate({ id: infographicId })}
              onRevoke={() => revoke.mutate({ id: infographicId })}
              isPending={isApprovalPending}
            />
            <ExportDropdown
              imageUrl={displayImageUrl}
              title={infographic.title}
              disabled={actions.isGenerating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={actions.handleSave}
              disabled={!actions.hasChanges || actions.isSaving}
            >
              {actions.isSaving ? <Spinner className="w-4 h-4 mr-1.5" /> : null}
              Save
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={actions.isDeleting}
              aria-label={`Delete ${infographic.title}`}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Controls */}
          <div className="w-[340px] border-r border-border/40 overflow-y-auto p-4 space-y-5">
            <PromptPanel
              prompt={settings.prompt}
              onPromptChange={settings.setPrompt}
              disabled={actions.isGenerating}
              isEditMode={hasExistingImage}
            />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Source Documents
                {documentSelection.documents.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({documentSelection.documents.length})
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Add documents to use as content source for your infographic
              </p>
              <DocumentManager
                documents={documentSelection.documents}
                onAddDocuments={documentSelection.addDocuments}
                onRemoveDocument={documentSelection.removeDocument}
                disabled={actions.isGenerating}
              />
            </div>

            <TypeSelector
              value={settings.infographicType}
              onChange={settings.setInfographicType}
              disabled={actions.isGenerating}
            />

            <StyleSelector
              value={settings.stylePreset}
              onChange={settings.setStylePreset}
              disabled={actions.isGenerating}
            />

            <FormatSelector
              value={settings.format}
              onChange={settings.setFormat}
              disabled={actions.isGenerating}
            />

            <Button
              className="w-full"
              onClick={actions.handleGenerate}
              disabled={!actions.hasPrompt || actions.isGenerating}
            >
              {actions.isGenerating ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {hasExistingImage ? 'Iterating...' : 'Generating...'}
                </>
              ) : hasExistingImage ? (
                'Iterate'
              ) : (
                'Generate'
              )}
            </Button>

            {infographic.errorMessage && !actions.isGenerating && (
              <div
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                role="alert"
              >
                {infographic.errorMessage}
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col p-4 overflow-auto">
            <PreviewPanel
              imageUrl={displayImageUrl}
              title={infographic.title}
              isGenerating={actions.isGenerating}
            />
          </div>
        </div>

        {/* Bottom - Version History */}
        <VersionHistoryStrip
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelectVersion={handleSelectVersion}
          isLoading={versionsLoading}
        />
      </div>

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Infographic"
        description="Are you sure you want to delete this infographic? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={actions.isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
