import { useCallback, useEffect, useMemo } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';
import {
  formatPodcastAssistantDraft,
  getPodcastAssistantSpeakerNames,
} from '../../lib/writing-assistant';
import { WritingAssistantPanel } from '@/shared/components/writing-assistant-panel';
import { useWritingAssistantChat } from '@/shared/hooks/use-writing-assistant-chat';
import { PODCAST_WRITING_ASSISTANT_HELP } from '@/shared/lib/content-guidance';

const PODCAST_ASSISTANT_EXAMPLE_PROMPTS = [
  'Rewrite the opening exchange to sound sharper and more conversational.',
  'Tighten this script so the episode lands faster without losing the key points.',
  'Smooth the handoff between the host and co-host in the middle section.',
] as const;

const PODCAST_CONFIRMATION_MESSAGE =
  'I updated the podcast script in the editor. These changes stay local until you click Save & Regenerate.';

interface WritingAssistantContainerProps {
  podcastId: string;
  format: 'voice_over' | 'conversation';
  segments: ScriptSegment[];
  onReplaceSegments: (segments: ScriptSegment[]) => void;
}

export function WritingAssistantContainer({
  podcastId,
  format,
  segments,
  onReplaceSegments,
}: WritingAssistantContainerProps) {
  const speakerNames = useMemo(
    () => getPodcastAssistantSpeakerNames({ segments, format }),
    [format, segments],
  );
  const draft = useMemo(
    () => formatPodcastAssistantDraft(segments),
    [segments],
  );

  const getDraftFromSegments = useCallback(
    (nextSegments: ScriptSegment[]) => formatPodcastAssistantDraft(nextSegments),
    [],
  );

  const { messages, sendUserMessage, isStreaming, error, reset } =
    useWritingAssistantChat({
      documentKind: 'podcast',
      draft,
      speakerNames,
      onApplySegmentsEdit: onReplaceSegments,
      getDraftFromSegments,
      confirmationMessage: PODCAST_CONFIRMATION_MESSAGE,
    });

  useEffect(() => {
    reset();
  }, [podcastId, reset]);

  return (
    <WritingAssistantPanel
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      onSendMessage={sendUserMessage}
      onReset={reset}
      description="Use AI to improve the current podcast script before you save and regenerate audio."
      helpText={PODCAST_WRITING_ASSISTANT_HELP}
      transientNotice="This chat is temporary and is not saved. Script rewrites update local draft state only until you click Save & Regenerate."
      examplePrompts={PODCAST_ASSISTANT_EXAMPLE_PROMPTS}
      inputPlaceholder="Ask AI to rewrite the intro, tighten the banter, or smooth podcast transitions..."
    />
  );
}
