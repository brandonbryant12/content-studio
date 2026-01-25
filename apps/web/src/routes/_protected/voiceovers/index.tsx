import { createFileRoute } from '@tanstack/react-router';
import { VoiceoverListContainer } from '@/features/voiceovers/components/voiceover-list-container';

export const Route = createFileRoute('/_protected/voiceovers/')({
  component: VoiceoversPage,
});

function VoiceoversPage() {
  return <VoiceoverListContainer />;
}
