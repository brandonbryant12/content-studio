import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useState, useEffect } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';
import { BaseDialog } from '@/shared/components/base-dialog';

interface SegmentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: ScriptSegment | null;
  onSave: (data: { speaker: string; line: string }) => void;
}

export function SegmentEditorDialog({
  open,
  onOpenChange,
  segment,
  onSave,
}: SegmentEditorDialogProps) {
  const [speaker, setSpeaker] = useState('');
  const [line, setLine] = useState('');

  useEffect(() => {
    if (segment) {
      setSpeaker(segment.speaker);
      setLine(segment.line);
    }
  }, [segment]);

  const handleSubmit = () => {
    onSave({ speaker: speaker.trim() || 'host', line: line.trim() });
  };

  const isValid = line.trim().length > 0;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Segment"
      description="Modify the speaker and dialogue for this segment."
      maxWidth="lg"
      footer={{
        submitText: 'Save',
        loadingText: 'Saving...',
        submitDisabled: !isValid,
        onSubmit: handleSubmit,
        isLoading: false,
      }}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="speaker">Speaker</Label>
          <Input
            id="speaker"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="host"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use "host" or "cohost" for consistent styling
          </p>
        </div>
        <div>
          <Label htmlFor="line">Line</Label>
          <Textarea
            id="line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Enter the dialogue..."
            rows={4}
            className="mt-1.5"
          />
        </div>
      </div>
    </BaseDialog>
  );
}
