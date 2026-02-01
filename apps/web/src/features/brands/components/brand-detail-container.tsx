// features/brands/components/brand-detail-container.tsx

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useBrand, getBrandQueryKey } from '../hooks/use-brand';
import { getBrandListQueryKey } from '../hooks/use-brand-list';
import { BrandDetail } from './brand-detail';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

interface BrandDetailContainerProps {
  brandId: string;
}

/**
 * Container: Fetches brand data and coordinates mutations.
 */
export function BrandDetailContainer({ brandId }: BrandDetailContainerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data fetching (Suspense handles loading)
  const { data: brand } = useBrand(brandId);

  // Delete mutation
  const deleteMutation = useMutation(
    apiClient.brands.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getBrandListQueryKey() });
        queryClient.removeQueries({ queryKey: getBrandQueryKey(brandId) });
        toast.success('Brand deleted');
        navigate({ to: '/brands' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete brand'));
      },
    }),
  );

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      deleteMutation.mutate({ id: brandId });
    }
  }, [brandId, deleteMutation]);

  return (
    <BrandDetail
      brand={brand}
      isDeleting={deleteMutation.isPending}
      onDelete={handleDelete}
    />
  );
}
