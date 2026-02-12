import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback } from 'react';

interface StartResearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (query: string, title?: string) => void;
  isSubmitting: boolean;
}

export function StartResearchDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: StartResearchDialogProps) {
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim().length < 10) return;
      onSubmit(query.trim(), title.trim() || undefined);
    },
    [query, title, onSubmit],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setQuery('');
        setTitle('');
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Deep Research
          </DialogTitle>
          <DialogDescription>
            Enter a topic or question to research. AI will search the web,
            analyze sources, and produce a comprehensive document for your
            knowledge base. This may take a few minutes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="research-query">Topic or Question</Label>
            <textarea
              id="research-query"
              placeholder="e.g. Latest developments in quantum computing and their practical applications"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              minLength={10}
              autoFocus
              disabled={isSubmitting}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            {query.length > 0 && query.length < 10 && (
              <p className="text-xs text-muted-foreground">
                Please enter at least 10 characters
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="research-title">
              Title{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="research-title"
              placeholder="Auto-generated from topic"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={query.trim().length < 10 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Starting...
                </>
              ) : (
                'Start Research'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
