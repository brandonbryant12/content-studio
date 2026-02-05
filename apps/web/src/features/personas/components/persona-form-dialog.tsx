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
import type { PersonaListItem } from './persona-item';

export interface PersonaFormData {
  name: string;
  role: 'host' | 'cohost';
  voiceId: string | null;
  voiceName: string | null;
  personalityDescription: string | null;
  speakingStyle: string | null;
}

interface PersonaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PersonaFormData) => void;
  isSubmitting: boolean;
  /** When provided, dialog opens in edit mode */
  editingPersona?: PersonaListItem | null;
}

export function PersonaFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingPersona,
}: PersonaFormDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'host' | 'cohost'>('host');
  const [personalityDescription, setPersonalityDescription] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');

  const isEditing = !!editingPersona;

  // Reset form when dialog opens/closes or editing persona changes
  useEffect(() => {
    if (open && editingPersona) {
      setName(editingPersona.name);
      setRole(editingPersona.role as 'host' | 'cohost');
      setPersonalityDescription(
        editingPersona.personalityDescription ?? '',
      );
      setSpeakingStyle(editingPersona.speakingStyle ?? '');
    } else if (!open) {
      setName('');
      setRole('host');
      setPersonalityDescription('');
      setSpeakingStyle('');
    }
  }, [open, editingPersona]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      onSubmit({
        name: name.trim(),
        role,
        voiceId: null,
        voiceName: null,
        personalityDescription: personalityDescription.trim() || null,
        speakingStyle: speakingStyle.trim() || null,
      });
    },
    [name, role, personalityDescription, speakingStyle, onSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Persona' : 'Create Persona'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the persona details.'
              : 'Define a new host or co-host persona for your podcasts.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Name</Label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex the Tech Expert"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('host')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  role === 'host'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Host
              </button>
              <button
                type="button"
                onClick={() => setRole('cohost')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  role === 'cohost'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Co-host
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-personality">
              Personality Description
            </Label>
            <Textarea
              id="persona-personality"
              value={personalityDescription}
              onChange={(e) => setPersonalityDescription(e.target.value)}
              placeholder="Describe the persona's personality, background, and communication style..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-speaking-style">Speaking Style</Label>
            <Textarea
              id="persona-speaking-style"
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              placeholder="e.g. Casual and conversational, uses analogies, avoids jargon..."
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
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Persona'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
