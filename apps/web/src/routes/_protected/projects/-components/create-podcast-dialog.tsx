import type { RouterOutput } from '@repo/api/client';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DocumentPicker } from './podcast/document-picker';
import { VoiceSelector } from './podcast/voice-selector';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import Spinner from '@/routes/-components/common/spinner';

type Document = RouterOutput['projects']['get']['documents'][number];

interface CreatePodcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectDocuments: Document[];
  /** Pre-selected document IDs from the content library sidebar */
  preSelectedDocumentIds?: string[];
}

export default function CreatePodcastDialog({
  open,
  onOpenChange,
  projectId,
  projectDocuments,
  preSelectedDocumentIds = [],
}: CreatePodcastDialogProps) {
  const [format, setFormat] = useState<'conversation' | 'voice_over'>(
    'conversation',
  );
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [hostVoice, setHostVoice] = useState('');
  const [coHostVoice, setCoHostVoice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetDuration, setTargetDuration] = useState(5);

  // Reset form when dialog opens, using pre-selected docs if available
  useEffect(() => {
    if (open) {
      setFormat('conversation');
      setSelectedDocIds(new Set(preSelectedDocumentIds));
      setHostVoice('');
      setCoHostVoice('');
      setInstructions('');
      setTargetDuration(5);
    }
  }, [open, preSelectedDocumentIds]);

  const { data: voices = [] } = useQuery(
    apiClient.voices.list.queryOptions({ input: {} }),
  );

  const generateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start generation');
      },
    }),
  );

  const createMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (podcast) => {
        // Trigger generation immediately after creation
        generateMutation.mutate({ id: podcast.id });

        await invalidateQueries('podcasts', 'projects');
        onOpenChange(false);
        toast.success('Podcast created! Starting generation...');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const toggleDocument = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedDocIds.size === 0) {
      toast.error('Please select at least one document');
      return;
    }

    const selectedVoice = voices.find((v) => v.id === hostVoice);
    const selectedCoHost = voices.find((v) => v.id === coHostVoice);

    createMutation.mutate({
      projectId,
      format,
      documentIds: Array.from(selectedDocIds),
      hostVoice: hostVoice || undefined,
      hostVoiceName: selectedVoice?.name,
      coHostVoice:
        format === 'conversation' ? coHostVoice || undefined : undefined,
      coHostVoiceName:
        format === 'conversation' ? selectedCoHost?.name : undefined,
      promptInstructions: instructions.trim() || undefined,
      targetDurationMinutes: targetDuration,
    });
  };

  const isConversation = format === 'conversation';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create {isConversation ? 'Podcast' : 'Voice Over'}
          </DialogTitle>
          <DialogDescription>
            {isConversation
              ? 'Create a conversational podcast from project documents.'
              : 'Create a voice over narration from project documents.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format toggle */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === 'conversation' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('conversation')}
              >
                Podcast
              </Button>
              <Button
                type="button"
                variant={format === 'voice_over' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('voice_over')}
              >
                Voice Over
              </Button>
            </div>
          </div>

          {/* Document selection */}
          <div className="space-y-2">
            <Label>Source Documents *</Label>
            <DocumentPicker
              documents={projectDocuments}
              selectedIds={selectedDocIds}
              onSelect={toggleDocument}
            />
            {selectedDocIds.size > 0 && (
              <p className="text-xs text-violet-600 dark:text-violet-400">
                {selectedDocIds.size} document
                {selectedDocIds.size > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Voice selection */}
          <VoiceSelector
            voices={voices}
            value={hostVoice}
            onChange={setHostVoice}
            label={isConversation ? 'Host Voice' : 'Narrator Voice'}
          />

          {isConversation && (
            <VoiceSelector
              voices={voices}
              value={coHostVoice}
              onChange={setCoHostVoice}
              label="Co-Host Voice"
            />
          )}

          {/* Target duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Target Duration: {targetDuration} minutes
            </Label>
            <input
              type="range"
              id="duration"
              min={1}
              max={10}
              value={targetDuration}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1 min</span>
              <span>10 min</span>
            </div>
          </div>

          {/* Custom instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Custom Instructions (optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions for the AI..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || selectedDocIds.size === 0}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create & Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
