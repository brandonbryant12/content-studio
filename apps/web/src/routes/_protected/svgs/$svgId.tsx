import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SvgCreatorContainer } from '@/features/svgs/components/svg-creator-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/svgs/$svgId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.svgs.get.queryOptions({
        input: { id: params.svgId },
      }),
    ),
  component: SvgCreatorPage,
});

function SvgCreatorPage() {
  const { svgId } = Route.useParams();

  return (
    <SuspenseBoundary resetKeys={[svgId]}>
      <SvgCreatorContainer svgId={svgId} />
    </SuspenseBoundary>
  );
}
