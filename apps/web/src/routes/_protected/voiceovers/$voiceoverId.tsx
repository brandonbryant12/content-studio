// routes/_protected/voiceovers/$voiceoverId.tsx
// Thin route file - delegates to feature container (to be implemented in Sprint 8)

import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';

export const Route = createFileRoute('/_protected/voiceovers/$voiceoverId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.voiceovers.get.queryOptions({ input: { id: params.voiceoverId } }),
    ),
  component: VoiceoverPage,
});

function VoiceoverPage() {
  const { voiceoverId } = Route.useParams();

  // Placeholder - will be replaced with VoiceoverDetailContainer in Sprint 8
  return (
    <div className="page-container-narrow">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Audio Content</p>
          <h1 className="page-title">Voiceover</h1>
        </div>
      </div>
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          Voiceover workbench coming soon (ID: {voiceoverId})
        </p>
      </div>
    </div>
  );
}
