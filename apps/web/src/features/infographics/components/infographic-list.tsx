import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Spinner } from '@repo/ui/components/spinner';
import { Textarea } from '@repo/ui/components/textarea';
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { InfographicItem, type InfographicListItem } from './infographic-item';
import { BulkActionBar } from '@/shared/components/bulk-action-bar';
import { CREATE_ACTION_LABELS } from '@/shared/lib/content-language';

const QUICK_START_FORMATS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'og_card', label: 'OG Card' },
] as const;

type InfographicFormat = (typeof QUICK_START_FORMATS)[number]['value'];

interface CreateInfographicPayload {
  title: string;
  format: InfographicFormat;
  prompt?: string;
  autoGenerate?: boolean;
}

interface EmptyStateProps {
  onCreateClick: () => void;
  isCreating: boolean;
}

function EmptyState({ onCreateClick, isCreating }: EmptyStateProps) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No infographics yet</h3>
      <p className="empty-state-description">
        Create your first infographic to get started.
      </p>
      <Button onClick={onCreateClick} disabled={isCreating}>
        {isCreating ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Creating...
          </>
        ) : (
          <>
            <PlusIcon className="w-4 h-4 mr-2" />
            {CREATE_ACTION_LABELS.infographic}
          </>
        )}
      </Button>
    </div>
  );
}

function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        No infographics found matching &ldquo;{searchQuery}&rdquo;
      </p>
    </div>
  );
}

interface InfographicListProps {
  infographics: readonly InfographicListItem[];
  searchQuery: string;
  isCreating: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onCreate: (payload: CreateInfographicPayload) => void;
  onDelete: (id: string) => void;
  selection: UseBulkSelectionReturn;
  isBulkDeleting: boolean;
  onBulkDelete: () => void;
}

export function InfographicList({
  infographics,
  searchQuery,
  isCreating,
  deletingId,
  onSearch,
  onCreate,
  onDelete,
  selection,
  isBulkDeleting,
  onBulkDelete,
}: InfographicListProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [formatDraft, setFormatDraft] = useState<InfographicFormat>('portrait');

  const filteredInfographics = useMemo(
    () =>
      infographics.filter((infographic) =>
        infographic.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [infographics, searchQuery],
  );

  const filteredIds = useMemo(
    () => filteredInfographics.map((i) => i.id),
    [filteredInfographics],
  );

  const handleSearch = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      startTransition(() => {
        onSearch(value);
      });
    },
    [onSearch],
  );

  const handleToggleAll = useCallback(() => {
    if (selection.isAllSelected(filteredIds)) {
      selection.deselectAll();
    } else {
      selection.selectAll(filteredIds);
    }
  }, [selection, filteredIds]);

  const isEmpty = infographics.length === 0;
  const hasNoResults =
    filteredInfographics.length === 0 && searchQuery.length > 0;
  const hasSelection = selection.selectedCount > 0;
  const hasPromptDraft = promptDraft.trim().length > 0;

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback((nextOpen: boolean) => {
    setDialogOpen(nextOpen);
    if (!nextOpen) {
      setPromptDraft('');
      setFormatDraft('portrait');
    }
  }, []);

  const handleCreate = useCallback(() => {
    onCreate({
      title: 'Untitled Infographic',
      format: formatDraft,
      prompt: hasPromptDraft ? promptDraft.trim() : undefined,
      autoGenerate: false,
    });
    closeDialog(false);
  }, [closeDialog, formatDraft, hasPromptDraft, onCreate, promptDraft]);

  const handleCreateAndGenerate = useCallback(() => {
    if (!hasPromptDraft) return;
    onCreate({
      title: 'Untitled Infographic',
      format: formatDraft,
      prompt: promptDraft.trim(),
      autoGenerate: true,
    });
    closeDialog(false);
  }, [closeDialog, formatDraft, hasPromptDraft, onCreate, promptDraft]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Infographics</p>
          <h1 className="page-title">Infographics</h1>
        </div>
        <Button onClick={openDialog} disabled={isCreating}>
          {isCreating ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" />
              {CREATE_ACTION_LABELS.infographic}
            </>
          )}
        </Button>
      </div>

      <div className="relative mb-4">
        <Input
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search infographics..."
          className="search-input pl-10"
          autoComplete="off"
          aria-label="Search infographics"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {isEmpty ? (
        <EmptyState onCreateClick={openDialog} isCreating={isCreating} />
      ) : hasNoResults ? (
        <NoResults searchQuery={searchQuery} />
      ) : (
        <div
          className={`card-grid transition-opacity ${isPending ? 'opacity-70' : ''}`}
        >
          {filteredInfographics.map((infographic) => (
            <InfographicItem
              key={infographic.id}
              infographic={infographic}
              onDelete={onDelete}
              isDeleting={deletingId === infographic.id}
              isSelected={selection.isSelected(infographic.id)}
              hasSelection={hasSelection}
              onToggleSelect={selection.toggle}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={filteredInfographics.length}
        isAllSelected={selection.isAllSelected(filteredIds)}
        isIndeterminate={selection.isIndeterminate(filteredIds)}
        isDeleting={isBulkDeleting}
        entityName="infographic"
        onToggleAll={handleToggleAll}
        onDeselectAll={selection.deselectAll}
        onDeleteSelected={onBulkDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Infographic</DialogTitle>
            <DialogDescription>
              Add a prompt and format now so your first version can start
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="infographic-quick-start-prompt">Prompt</Label>
              <Textarea
                id="infographic-quick-start-prompt"
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
                placeholder="Describe the infographic you want to generate..."
                rows={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to create a draft and generate later.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Format</legend>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_START_FORMATS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={formatDraft === option.value}
                    onClick={() => setFormatDraft(option.value)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formatDraft === option.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => closeDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Draft'}
            </Button>
            <Button
              onClick={handleCreateAndGenerate}
              disabled={isCreating || !hasPromptDraft}
            >
              {isCreating ? 'Creating...' : 'Create & Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
