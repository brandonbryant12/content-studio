import { createFileRoute } from '@tanstack/react-router';
import { InfographicListContainer } from '@/features/infographics/components';

export const Route = createFileRoute('/_protected/infographics/')({
  component: InfographicsPage,
});

function InfographicsPage() {
  return <InfographicListContainer />;
}
