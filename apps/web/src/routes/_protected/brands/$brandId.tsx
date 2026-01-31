// routes/_protected/brands/$brandId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { BrandDetailContainer } from '@/features/brands/components/brand-detail-container';

export const Route = createFileRoute('/_protected/brands/$brandId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.brands.get.queryOptions({ input: { id: params.brandId } }),
    ),
  component: BrandPage,
});

function BrandPage() {
  const { brandId } = Route.useParams();

  return (
    <SuspenseBoundary resetKeys={[brandId]}>
      <BrandDetailContainer brandId={brandId} />
    </SuspenseBoundary>
  );
}
