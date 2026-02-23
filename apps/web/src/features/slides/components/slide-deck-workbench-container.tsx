import {
  ArrowLeftIcon,
  DownloadIcon,
  MagicWandIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Badge, type BadgeVariant } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Select } from '@repo/ui/components/select';
import { Spinner } from '@repo/ui/components/spinner';
import { Textarea } from '@repo/ui/components/textarea';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import {
  useDeleteSlideDeck,
  useGenerateSlideDeck,
  useSlideDeck,
  useSlideDeckVersions,
  useSlidesAssistantChat,
  useUpdateSlideDeck,
} from '../hooks';
import { SlideDeckChatPanel } from './slide-deck-chat-panel';
import { SlideDeckPreview } from './slide-deck-preview';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { buildDownloadFileName, downloadTextFile } from '@/shared/lib/file-download';

type SlideDeck = RouterOutput['slideDecks']['get'];

const THEME_OPTIONS: Array<SlideDeck['theme']> = [
  'executive',
  'academic',
  'minimal',
  'contrast',
  'blueprint',
  'sunrise',
  'graphite',
  'editorial',
];

const STATUS_LABEL: Record<SlideDeck['status'], string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<SlideDeck['status'], BadgeVariant> = {
  draft: 'default',
  generating: 'warning',
  ready: 'success',
  failed: 'error',
};

const parseSlideInput = (
  value: string,
  fallback: SlideDeck['slides'],
): { slides: SlideDeck['slides']; hasError: boolean } => {
  if (value.trim().length === 0) {
    return { slides: [], hasError: false };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return { slides: fallback, hasError: true };
    }
    return { slides: parsed as SlideDeck['slides'], hasError: false };
  } catch {
    return { slides: fallback, hasError: true };
  }
};

const parseSourceDocumentIdsInput = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

interface SlideDeckWorkbenchContainerProps {
  slideDeckId: string;
}

export function SlideDeckWorkbenchContainer({
  slideDeckId,
}: SlideDeckWorkbenchContainerProps) {
  const { data: slideDeck } = useSlideDeck(slideDeckId);
  const { data: versions = [] } = useSlideDeckVersions(slideDeckId);
  const updateMutation = useUpdateSlideDeck(slideDeckId);
  const deleteMutation = useDeleteSlideDeck();
  const generateMutation = useGenerateSlideDeck(slideDeckId);
  const assistant = useSlidesAssistantChat();

  const [title, setTitle] = useState(slideDeck.title);
  const [prompt, setPrompt] = useState(slideDeck.prompt ?? '');
  const [theme, setTheme] = useState<SlideDeck['theme']>(slideDeck.theme);
  const [sourceDocumentIdsText, setSourceDocumentIdsText] = useState(
    slideDeck.sourceDocumentIds.join('\n'),
  );
  const [slidesJson, setSlidesJson] = useState(
    JSON.stringify(slideDeck.slides, null, 2),
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedVersion = selectedVersionId
    ? versions.find((version) => version.id === selectedVersionId) ?? null
    : null;

  const parsedSlides = useMemo(
    () => parseSlideInput(slidesJson, slideDeck.slides),
    [slidesJson, slideDeck.slides],
  );

  const previewSlides = selectedVersion ? selectedVersion.slides : parsedSlides.slides;
  const previewHtml = selectedVersion ? selectedVersion.generatedHtml : slideDeck.generatedHtml;

  const onSave = useCallback(() => {
    const sourceDocumentIds = parseSourceDocumentIdsInput(sourceDocumentIdsText);

    updateMutation.mutate({
      id: slideDeck.id,
      title: title.trim().length > 0 ? title.trim() : 'Untitled Slide Deck',
      prompt: prompt.trim().length > 0 ? prompt.trim() : '',
      theme,
      sourceDocumentIds,
      slides: parsedSlides.slides,
    });
  }, [
    parsedSlides.slides,
    prompt,
    slideDeck.id,
    sourceDocumentIdsText,
    theme,
    title,
    updateMutation,
  ]);

  const onGenerate = useCallback(() => {
    generateMutation.mutate({ id: slideDeck.id });
  }, [generateMutation, slideDeck.id]);

  const onDelete = useCallback(() => {
    deleteMutation.mutate({ id: slideDeck.id });
  }, [deleteMutation, slideDeck.id]);

  const onExportHtml = () => {
    if (!previewHtml) return;
    const fileName = buildDownloadFileName({
      title: slideDeck.title,
      extension: 'html',
      fallbackSlug: 'slide-deck',
      labels: [selectedVersion ? `v${selectedVersion.versionNumber}` : undefined],
      date: selectedVersion?.createdAt ?? slideDeck.updatedAt,
    });
    downloadTextFile(previewHtml, fileName, 'text/html;charset=utf-8');
  };

  const onSendChatMessage = (text: string) => assistant.sendMessage({ text });

  const isBusy =
    updateMutation.isPending ||
    generateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <div className="workbench">
        <header className="workbench-header">
          <div className="workbench-header-content">
            <div className="workbench-header-row">
              <Link
                to="/slides"
                className="workbench-back-btn"
                aria-label="Back to slide decks"
              >
                <ArrowLeftIcon />
              </Link>

              <div className="workbench-title-group min-w-0">
                <h1 className="workbench-title truncate">{slideDeck.title}</h1>
              </div>

              <div className="workbench-meta">
                <Badge variant={STATUS_VARIANT[slideDeck.status]} className="gap-1.5">
                  {slideDeck.status === 'generating' ? (
                    <Spinner className="w-3 h-3" />
                  ) : null}
                  {STATUS_LABEL[slideDeck.status]}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportHtml}
                  disabled={!previewHtml}
                >
                  <DownloadIcon className="w-4 h-4 mr-1.5" />
                  Export HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerate}
                  disabled={isBusy || slideDeck.status === 'generating'}
                >
                  {generateMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-1.5" />
                  ) : (
                    <MagicWandIcon className="w-4 h-4 mr-1.5" />
                  )}
                  Generate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  disabled={isBusy || parsedSlides.hasError}
                >
                  {updateMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-1.5" />
                  ) : null}
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isBusy}
                  aria-label={`Delete ${slideDeck.title}`}
                >
                  {deleteMutation.isPending ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="workbench-main">
          <aside className="workbench-panel-right border-r border-border">
            <div className="h-full overflow-auto p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Title
                </label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Prompt
                </label>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={4}
                  placeholder="Describe the presentation you want to generate..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Theme
                </label>
                <Select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as SlideDeck['theme'])}
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Source Document IDs
                </label>
                <Textarea
                  value={sourceDocumentIdsText}
                  onChange={(event) => setSourceDocumentIdsText(event.target.value)}
                  rows={4}
                  placeholder="doc_... one per line or comma-separated"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Slides JSON
                </label>
                <Textarea
                  value={slidesJson}
                  onChange={(event) => setSlidesJson(event.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
                {parsedSlides.hasError ? (
                  <p className="text-xs text-destructive">
                    Invalid JSON. Save is disabled until this is valid.
                  </p>
                ) : null}
              </div>

              {versions.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Version Preview
                  </label>
                  <Select
                    value={selectedVersionId ?? ''}
                    onChange={(event) =>
                      setSelectedVersionId(
                        event.target.value.length > 0 ? event.target.value : null,
                      )
                    }
                  >
                    <option value="">Current Draft</option>
                    {versions
                      .slice()
                      .reverse()
                      .map((version) => (
                        <option key={version.id} value={version.id}>
                          v{version.versionNumber} ·{' '}
                          {new Date(version.createdAt).toLocaleString()}
                        </option>
                      ))}
                  </Select>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="workbench-panel-left">
            <div className="h-full p-4 lg:p-6">
              <SlideDeckPreview
                title={
                  selectedVersion
                    ? `${slideDeck.title} (v${selectedVersion.versionNumber})`
                    : slideDeck.title
                }
                slides={previewSlides}
                generatedHtml={previewHtml}
              />
            </div>
          </section>

          <aside className="workbench-panel-right">
            <SlideDeckChatPanel
              messages={assistant.messages}
              status={assistant.status}
              error={assistant.error}
              onSendMessage={onSendChatMessage}
            />
          </aside>
        </div>
      </div>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Slide Deck"
        description="Are you sure you want to delete this slide deck? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
