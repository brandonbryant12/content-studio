import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { DocumentPicker } from './podcast/document-picker';
import { VoiceSelector } from './podcast/voice-selector';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { BaseDialog } from '@/components/base-dialog';

type Document = RouterOutput['projects']['get']['documents'][number];

interface CreatePodcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectDocuments: Document[];
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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form state when dialog opens
      setFormat('conversation');
      setSelectedDocIds(new Set(preSelectedDocumentIds));
      setHostVoice('');
      setCoHostVoice('');
      setInstructions('');
      setTargetDuration(5);
    }
    onOpenChange(newOpen);
  };

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
        generateMutation.mutate({ id: podcast.id });
        toast.success('Podcast created! Starting generation...');
        onOpenChange(false);
        await invalidateQueries('podcasts', 'projects');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

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
    <BaseDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Create ${isConversation ? 'Podcast' : 'Voice Over'}`}
      description={
        isConversation
          ? 'Create a conversational podcast from project documents.'
          : 'Create a voice over narration from project documents.'
      }
      scrollable
      footer={{
        submitText: 'Create & Generate',
        loadingText: 'Creating...',
        submitDisabled: selectedDocIds.size === 0,
        onSubmit: handleSubmit,
        isLoading: createMutation.isPending,
      }}
    >
      <div className="space-y-4">
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
    </BaseDialog>
  );
}
