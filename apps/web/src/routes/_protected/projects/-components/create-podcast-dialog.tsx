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
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

interface CreatePodcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectDocuments: ProjectDocument[];
}

type ProjectDocument =
  RouterOutput['projects']['getWithMedia']['media'][number] & {
    mediaType: 'document';
  };

type Voice = RouterOutput['voices']['list'][number];

function DocumentPicker({
  documents,
  selectedIds,
  onSelect,
}: {
  documents: ProjectDocument[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No documents in this project. Add documents first.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-gray-700">
      {documents.map((doc) => (
        <label
          key={doc.mediaId}
          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
            selectedIds.has(doc.mediaId)
              ? 'bg-violet-50 dark:bg-violet-900/20'
              : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(doc.mediaId)}
            onChange={() => onSelect(doc.mediaId)}
            className="rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.media.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doc.media.wordCount.toLocaleString()} words
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}

function VoiceSelector({
  voices,
  value,
  onChange,
  label,
}: {
  voices: Voice[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Select a voice...</option>
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.gender})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CreatePodcastDialog({
  open,
  onOpenChange,
  projectId,
  projectDocuments,
}: CreatePodcastDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<'conversation' | 'voice_over'>(
    'conversation',
  );
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [hostVoice, setHostVoice] = useState('');
  const [coHostVoice, setCoHostVoice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetDuration, setTargetDuration] = useState(5);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setFormat('conversation');
      setSelectedDocIds(new Set());
      setHostVoice('');
      setCoHostVoice('');
      setInstructions('');
      setTargetDuration(5);
    }
  }, [open]);

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

        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            (query.queryKey[0] === 'podcasts' ||
              query.queryKey[0] === 'projects'),
        });
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
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (selectedDocIds.size === 0) {
      toast.error('Please select at least one document');
      return;
    }

    const selectedVoice = voices.find((v) => v.id === hostVoice);
    const selectedCoHost = voices.find((v) => v.id === coHostVoice);

    createMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isConversation ? 'My Podcast Episode' : 'My Voice Over'
              }
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
            />
          </div>

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
