import { useState, useCallback } from 'react';
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

interface AddFromUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string, title?: string) => void;
  isSubmitting: boolean;
}

export function AddFromUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddFromUrlDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      onSubmit(url.trim(), title.trim() || undefined);
    },
    [url, title, onSubmit],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setUrl('');
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
            <Label htmlFor="title">
              Title{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="title"
              placeholder="Auto-detected from page"
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
