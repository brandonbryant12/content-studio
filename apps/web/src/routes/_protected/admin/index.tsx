import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { AdminUserSearchContainer } from '@/features/admin/components/admin-user-search-container';
import { DEFAULT_ADMIN_USER_SEARCH_LIMIT } from '@/features/admin/hooks';

export const Route = createFileRoute('/_protected/admin/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.admin.users.search.queryOptions({
        input: { limit: DEFAULT_ADMIN_USER_SEARCH_LIMIT },
      }),
    ),
  component: AdminPage,
});

function AdminPage() {
  useEffect(() => {
    document.title = 'Admin - Content Studio';
  }, []);

  return <AdminUserSearchContainer />;
}
