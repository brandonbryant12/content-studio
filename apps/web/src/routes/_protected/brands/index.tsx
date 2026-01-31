import { createFileRoute } from '@tanstack/react-router';
import { BrandListContainer } from '@/features/brands/components/brand-list-container';

export const Route = createFileRoute('/_protected/brands/')({
  component: BrandsPage,
});

function BrandsPage() {
  return <BrandListContainer />;
}
