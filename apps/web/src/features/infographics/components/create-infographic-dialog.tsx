import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useCallback, useState, type ReactNode } from 'react';

const QUICK_START_FORMATS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'og_card', label: 'OG Card' },
] as const;

type InfographicFormat = (typeof QUICK_START_FORMATS)[number]['value'];

export interface CreateInfographicPayload {
  title: string;
  format: InfographicFormat;
  prompt?: string;
  autoGenerate?: boolean;
}

interface CreateInfographicDialogProps {
  /** Optional trigger element — when provided, renders as DialogTrigger */
  children?: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open-change handler */
  onOpenChange?: (open: boolean) => void;
  isCreating: boolean;
  onCreate: (payload: CreateInfographicPayload) => void;
}

export function CreateInfographicDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  isCreating,
  onCreate,
}: CreateInfographicDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [formatDraft, setFormatDraft] = useState<InfographicFormat>('portrait');

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setPromptDraft('');
        setFormatDraft('portrait');
      }
    },
    [setOpen],
  );

  const hasPromptDraft = promptDraft.trim().length > 0;

  const handleCreate = useCallback(() => {
    onCreate({
      title: 'Untitled Infographic',
      format: formatDraft,
      prompt: hasPromptDraft ? promptDraft.trim() : undefined,
      autoGenerate: false,
    });
    handleOpenChange(false);
  }, [formatDraft, hasPromptDraft, onCreate, promptDraft, handleOpenChange]);

  const handleCreateAndGenerate = useCallback(() => {
    if (!hasPromptDraft) return;
    onCreate({
      title: 'Untitled Infographic',
      format: formatDraft,
      prompt: promptDraft.trim(),
      autoGenerate: true,
    });
    handleOpenChange(false);
  }, [formatDraft, hasPromptDraft, onCreate, promptDraft, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
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
            onClick={() => handleOpenChange(false)}
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
  );
}
