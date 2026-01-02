import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useState } from 'react';
import { BaseDialog } from '@/shared/components/base-dialog';

interface AddSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { speaker: string; line: string }) => void;
}

export function AddSegmentDialog({
  open,
  onOpenChange,
  onAdd,
}: AddSegmentDialogProps) {
  const [speaker, setSpeaker] = useState('host');
  const [line, setLine] = useState('');

  const handleSubmit = () => {
    onAdd({ speaker: speaker.trim() || 'host', line: line.trim() });
    setSpeaker('host');
    setLine('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSpeaker('host');
      setLine('');
    }
    onOpenChange(isOpen);
  };

  const isValid = line.trim().length > 0;

  return (
    <BaseDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Segment"
      description="Add a new dialogue segment to the script."
      maxWidth="lg"
      footer={{
        submitText: 'Add',
        loadingText: 'Adding...',
        submitDisabled: !isValid,
        onSubmit: handleSubmit,
        isLoading: false,
      }}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="add-speaker">Speaker</Label>
          <Input
            id="add-speaker"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="host"
            className="mt-1.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use "host" or "cohost" for consistent styling
          </p>
        </div>
        <div>
          <Label htmlFor="add-line">Line</Label>
          <Textarea
            id="add-line"
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
