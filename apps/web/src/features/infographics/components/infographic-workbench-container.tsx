import { ArrowLeftIcon, ReloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { UseInfographicSettingsReturn } from '../hooks/use-infographic-settings';
import type { InfographicVersion } from '../hooks/use-infographic-versions';
import type { RouterOutput } from '@repo/api/client';
import { useApproveInfographic } from '../hooks/use-approve-infographic';
import { useInfographic } from '../hooks/use-infographic';
import { useInfographicActions } from '../hooks/use-infographic-actions';
import { useInfographicSettings } from '../hooks/use-infographic-settings';
import { useInfographicVersions } from '../hooks/use-infographic-versions';
import { ExportDropdown } from './export-dropdown';
import { FormatSelector } from './format-selector';
import { PreviewPanel } from './preview-panel';
import { PromptPanel } from './prompt-panel';
import { StyleSection } from './style-section';
import { VersionHistoryStrip } from './version-history-strip';
import { ApproveButton } from '@/shared/components/approval/approve-button';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import {
  useSessionGuard,
  useKeyboardShortcut,
  useNavigationBlock,
} from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { getStorageUrl } from '@/shared/lib/storage-url';

type InfographicFull = RouterOutput['infographics']['get'];

interface WorkbenchHeaderProps {
  infographic: InfographicFull;
  isApproved: boolean;
  isAdmin: boolean;
  isApprovalPending: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  displayImageUrl: string | null;
  exportFormat?: string;
  exportVersionNumber?: number | null;
  exportUpdatedAt?: string;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onDeleteRequest: () => void;
  actions: { isGenerating: boolean; isSaving: boolean; isDeleting: boolean };
}

function WorkbenchHeader({
  infographic,
  isApproved,
  isAdmin,
  isApprovalPending,
  onApprove,
  onRevoke,
  displayImageUrl,
  exportFormat,
  exportVersionNumber,
  exportUpdatedAt,
  hasUnsavedChanges,
  onSave,
  onDeleteRequest,
  actions,
}: WorkbenchHeaderProps) {
  return (
    <header className="workbench-header">
      <div className="workbench-header-content">
        <div className="workbench-header-row">
          <Link
            to="/infographics"
            className="workbench-back-btn"
            aria-label="Back to infographics"
          >
            <ArrowLeftIcon />
          </Link>
          <div className="workbench-title-group">
            <div className="min-w-0">
              <h1 className="workbench-title">{infographic.title}</h1>
            </div>
          </div>
          <div className="workbench-meta">
            <ApproveButton
              isApproved={isApproved}
              isAdmin={isAdmin}
              onApprove={onApprove}
              onRevoke={onRevoke}
              isPending={isApprovalPending}
            />
            <ExportDropdown
              imageUrl={displayImageUrl}
              title={infographic.title}
              format={exportFormat}
              versionNumber={exportVersionNumber}
              updatedAt={exportUpdatedAt}
              disabled={actions.isGenerating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={!hasUnsavedChanges || actions.isSaving}
            >
              {actions.isSaving ? <Spinner className="w-4 h-4 mr-1.5" /> : null}
              Save
            </Button>
            <div className="workbench-actions">
              <Button
                variant="ghost"
                size="icon"
                onClick={onDeleteRequest}
                disabled={actions.isDeleting}
                className="workbench-delete-btn"
                aria-label={`Delete ${infographic.title}`}
              >
                {actions.isDeleting ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <TrashIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface ControlsSidebarProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  hasExistingImage: boolean;
  isViewingHistoricalVersion: boolean;
  selectedVersion: InfographicVersion | null;
  viewingVersionNumber: number | null;
  latestVersionNumber: number | null;
  onUseLatestBase: () => void;
  settings: UseInfographicSettingsReturn;
  actions: { isGenerating: boolean; isDeleting: boolean };
  infographic: InfographicFull;
  hasPrompt: boolean;
  onGenerate: () => void;
}

function ControlsSidebar({
  prompt,
  onPromptChange,
  hasExistingImage,
  isViewingHistoricalVersion,
  selectedVersion,
  viewingVersionNumber,
  latestVersionNumber,
  onUseLatestBase,
  settings,
  actions,
  infographic,
  hasPrompt,
  onGenerate,
}: ControlsSidebarProps) {
  const layoutSections = infographic.layout?.sections ?? [];

  return (
    <aside className="w-[380px] shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="p-5 pb-4">
          {hasExistingImage && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Iteration Mode
              </p>
              <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                Editing an existing image. Generating creates a new version from
                the latest result.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                  Viewing v{viewingVersionNumber ?? '—'}
                </span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                  Base v{latestVersionNumber ?? '—'}
                </span>
                {isViewingHistoricalVersion && selectedVersion ? (
                  <button
                    type="button"
                    onClick={onUseLatestBase}
                    className="rounded-full border border-border px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    Use latest as base
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <PromptPanel
            prompt={prompt}
            onPromptChange={onPromptChange}
            disabled={actions.isGenerating}
            isEditMode={hasExistingImage}
          />

          {layoutSections.length > 0 && (
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-foreground">Structured Layout</p>
              <p className="mt-0.5 text-muted-foreground">
                {infographic.layout?.title}
              </p>
              <ul className="mt-2 space-y-2">
                {layoutSections.slice(0, 4).map((section, index) => (
                  <li key={`${section.heading}-${index}`} className="space-y-1">
                    <p className="font-medium text-foreground/90">
                      {section.heading}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">
                      {section.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 p-5 pb-4">
          <StyleSection
            properties={settings.styleProperties}
            onChange={settings.setStyleProperties}
            disabled={actions.isGenerating}
          />
        </div>

        <div className="border-t border-border/40 p-5">
          <FormatSelector
            value={settings.format}
            onChange={settings.setFormat}
            disabled={actions.isGenerating}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4 space-y-3">
        {infographic.errorMessage && !actions.isGenerating && (
          <div
            className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
            role="alert"
          >
            {infographic.errorMessage}
          </div>
        )}
        <Button
          className="w-full"
          onClick={onGenerate}
          disabled={!hasPrompt || actions.isGenerating}
        >
          {actions.isGenerating ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              {hasExistingImage ? 'Generating New Version...' : 'Generating...'}
            </>
          ) : infographic.status === 'failed' ? (
            <>
              <ReloadIcon className="w-4 h-4 mr-2" />
              Retry
            </>
          ) : hasExistingImage && isViewingHistoricalVersion ? (
            `Generate From Base v${latestVersionNumber ?? '—'}`
          ) : hasExistingImage ? (
            'Generate New Version'
          ) : (
            'Generate'
          )}
        </Button>
        {hasExistingImage && isViewingHistoricalVersion && selectedVersion ? (
          <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Viewing v{selectedVersion.versionNumber}. New generations will use
            latest base v{latestVersionNumber ?? selectedVersion.versionNumber}.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

interface InfographicWorkbenchContainerProps {
  infographicId: string;
}

function resolveVersionViewState(
  versions: readonly InfographicVersion[],
  selectedVersionId: string | null,
  infographic: InfographicFull,
) {
  const selectedVersion = selectedVersionId
    ? (versions.find((version) => version.id === selectedVersionId) ?? null)
    : null;
  const latestVersion =
    versions.length > 0 ? (versions[versions.length - 1] ?? null) : null;
  const latestVersionNumber = latestVersion?.versionNumber ?? null;
  const isViewingHistoricalVersion =
    selectedVersion !== null && selectedVersion.id !== latestVersion?.id;
  const viewingVersionNumber =
    selectedVersion?.versionNumber ?? latestVersionNumber;
  const storageKey =
    selectedVersion?.imageStorageKey ?? infographic.imageStorageKey;

  return {
    selectedVersion,
    latestVersionNumber,
    isViewingHistoricalVersion,
    viewingVersionNumber,
    storageKey,
    exportFormat: selectedVersion?.format ?? infographic.format,
    exportVersionNumber: selectedVersion?.versionNumber ?? latestVersionNumber,
    exportUpdatedAt: selectedVersion?.createdAt ?? infographic.updatedAt,
  };
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

  const actions = useInfographicActions({
    infographicId,
    infographic,
    settings,
  });

  const { data: versions = [], isLoading: versionsLoading } =
    useInfographicVersions(infographicId);

  const [iterationPromptById, setIterationPromptById] = useState<
    Record<string, string>
  >({});
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const versionViewState = resolveVersionViewState(
    versions,
    selectedVersionId,
    infographic,
  );
  const displayImageUrl = versionViewState.storageKey
    ? getStorageUrl(versionViewState.storageKey)
    : null;
  const hasExistingImage = infographic.imageStorageKey !== null;

  const iterationPrompt = iterationPromptById[infographic.id] ?? '';

  const setIterationPrompt = useCallback(
    (nextPrompt: string) => {
      setIterationPromptById((prev) => {
        if (nextPrompt.length === 0) {
          if (!(infographic.id in prev)) return prev;
          const { [infographic.id]: _removed, ...rest } = prev;
          return rest;
        }

        if (prev[infographic.id] === nextPrompt) return prev;
        return {
          ...prev,
          [infographic.id]: nextPrompt,
        };
      });
    },
    [infographic.id],
  );

  const prompt = hasExistingImage ? iterationPrompt : settings.prompt;
  const hasPrompt = prompt.trim().length > 0;
  const hasPromptDraft =
    hasExistingImage &&
    iterationPrompt.trim().length > 0 &&
    iterationPrompt !== settings.prompt;
  const hasUnsavedChanges = actions.hasChanges || hasPromptDraft;

  const getPromptOverride = useCallback(() => {
    if (!hasExistingImage) return undefined;
    return iterationPrompt.trim().length > 0 ? iterationPrompt : undefined;
  }, [hasExistingImage, iterationPrompt]);

  const handlePromptChange = useCallback(
    (nextPrompt: string) => {
      if (hasExistingImage) {
        setIterationPrompt(nextPrompt);
        return;
      }
      settings.setPrompt(nextPrompt);
    },
    [hasExistingImage, settings, setIterationPrompt],
  );

  const handleSave = useCallback(async () => {
    try {
      await actions.handleSave(getPromptOverride());
    } catch {
      // Errors are surfaced in mutation toasts.
    }
  }, [actions, getPromptOverride]);

  const handleGenerate = useCallback(async () => {
    const promptOverride = getPromptOverride();

    try {
      await actions.handleGenerate(promptOverride);

      if (hasExistingImage && promptOverride) {
        setIterationPrompt('');
      }
    } catch {
      // Errors are surfaced in mutation toasts.
    }
  }, [actions, getPromptOverride, hasExistingImage, setIterationPrompt]);

  // Keyboard shortcuts
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
    enabled: hasUnsavedChanges,
  });

  useKeyboardShortcut({
    key: 'Enter',
    cmdOrCtrl: true,
    onTrigger: handleGenerate,
    enabled: hasPrompt && !actions.isGenerating,
  });

  useNavigationBlock({
    shouldBlock: hasUnsavedChanges && !actions.isGenerating,
  });

  const handleSelectVersion = useCallback((versionId: string) => {
    setSelectedVersionId((prev) => (prev === versionId ? null : versionId));
  }, []);
  const handleUseLatestBase = useCallback(() => {
    setSelectedVersionId(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    actions.handleDelete();
  }, [actions]);

  return (
    <>
      <div className="workbench">
        <WorkbenchHeader
          infographic={infographic}
          isApproved={isApproved}
          isAdmin={isAdmin}
          isApprovalPending={isApprovalPending}
          onApprove={() => approve.mutate({ id: infographicId })}
          onRevoke={() => revoke.mutate({ id: infographicId })}
          displayImageUrl={displayImageUrl}
          exportFormat={versionViewState.exportFormat}
          exportVersionNumber={versionViewState.exportVersionNumber}
          exportUpdatedAt={versionViewState.exportUpdatedAt}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          onDeleteRequest={() => setDeleteConfirmOpen(true)}
          actions={actions}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <ControlsSidebar
            prompt={prompt}
            onPromptChange={handlePromptChange}
            hasExistingImage={hasExistingImage}
            isViewingHistoricalVersion={
              versionViewState.isViewingHistoricalVersion
            }
            selectedVersion={versionViewState.selectedVersion}
            viewingVersionNumber={versionViewState.viewingVersionNumber}
            latestVersionNumber={versionViewState.latestVersionNumber}
            onUseLatestBase={handleUseLatestBase}
            settings={settings}
            actions={actions}
            infographic={infographic}
            hasPrompt={hasPrompt}
            onGenerate={handleGenerate}
          />

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              <PreviewPanel
                imageUrl={displayImageUrl}
                title={infographic.title}
                isGenerating={actions.isGenerating}
              />
            </div>
            <VersionHistoryStrip
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={handleSelectVersion}
              latestVersionNumber={versionViewState.latestVersionNumber}
              onUseLatestBase={handleUseLatestBase}
              isLoading={versionsLoading}
            />
          </div>
        </div>
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
