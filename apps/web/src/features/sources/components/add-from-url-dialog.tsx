import { GlobeIcon } from '@radix-ui/react-icons';
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
import { useState, useCallback, useMemo } from 'react';
import { getRandomUrlSourceSuggestions } from '../lib/url-source-suggestions';

interface AddFromUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => void;
  isSubmitting: boolean;
}

export function AddFromUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddFromUrlDialogProps) {
  const [url, setUrl] = useState('');
  const suggestions = useMemo(
    () => (open ? getRandomUrlSourceSuggestions(3) : []),
    [open],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      onSubmit(url.trim());
    },
    [url, onSubmit],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setUrl('');
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
            <GlobeIcon className="w-5 h-5" />
            Add from URL
          </DialogTitle>
          <DialogDescription>
            Enter a URL to scrape content from a web page. The content will be
            extracted and stored in your knowledge base.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Need ideas?</p>
            <p className="text-xs text-muted-foreground">
              Try one of these reliable public sources.
            </p>
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.url}
                  type="button"
                  variant="outline"
                  className="justify-start text-left h-auto py-2 px-3"
                  disabled={isSubmitting}
                  onClick={() => setUrl(suggestion.url)}
                >
                  <span className="truncate">{suggestion.label}</span>
                </Button>
              ))}
            </div>
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
            <Button type="submit" disabled={!url.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Processing...
                </>
              ) : (
                'Add URL'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
