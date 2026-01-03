import { createFileRoute } from '@tanstack/react-router';
import { VoiceoverListContainer } from '@/features/voiceovers/components';

export const Route = createFileRoute('/_protected/voiceovers/')({
  component: VoiceoversPage,
});

function VoiceoversPage() {
  return <VoiceoverListContainer />;
}
