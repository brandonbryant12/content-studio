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
import { Textarea } from '@repo/ui/components/textarea';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useEffect, useState } from 'react';
import type { AudienceSegmentListItem } from './audience-item';

export interface AudienceSegmentFormData {
  name: string;
  description: string | null;
  messagingTone: string | null;
  keyInterests: string | null;
}

interface AudienceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AudienceSegmentFormData) => void;
  isSubmitting: boolean;
  editingSegment?: AudienceSegmentListItem | null;
}

export function AudienceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingSegment,
}: AudienceFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [messagingTone, setMessagingTone] = useState('');
  const [keyInterests, setKeyInterests] = useState('');

  const isEditing = !!editingSegment;

  useEffect(() => {
    if (open && editingSegment) {
      setName(editingSegment.name);
      setDescription(editingSegment.description ?? '');
      setMessagingTone(editingSegment.messagingTone ?? '');
      setKeyInterests(editingSegment.keyInterests ?? '');
    } else if (!open) {
      setName('');
      setDescription('');
      setMessagingTone('');
      setKeyInterests('');
    }
  }, [open, editingSegment]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        messagingTone: messagingTone.trim() || null,
        keyInterests: keyInterests.trim() || null,
      });
    },
    [name, description, messagingTone, keyInterests, onSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Audience Segment' : 'Create Audience Segment'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the audience segment details.'
              : 'Define a target audience to tailor your podcast content.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="audience-name">Name</Label>
            <Input
              id="audience-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tech-savvy Professionals"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience-description">Description</Label>
            <Textarea
              id="audience-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe who this audience is, their background, and what they care about..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience-tone">Messaging Tone</Label>
            <Input
              id="audience-tone"
              value={messagingTone}
              onChange={(e) => setMessagingTone(e.target.value)}
              placeholder="e.g. Professional but approachable"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience-interests">Key Interests</Label>
            <Textarea
              id="audience-interests"
              value={keyInterests}
              onChange={(e) => setKeyInterests(e.target.value)}
              placeholder="e.g. AI/ML, cloud computing, startup culture, productivity tools..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Segment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
