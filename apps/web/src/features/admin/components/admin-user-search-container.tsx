import { useDeferredValue, useState } from 'react';
import { useAdminUserSearch } from '../hooks';
import { AdminUserSearchPage } from './admin-user-search-page';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';

export function AdminUserSearchContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const {
    data: users = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminUserSearch(deferredSearch);

  if (isPending) {
    return <ListPageLoadingState title="Users" />;
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Users"
        error={error}
        fallbackMessage="Failed to load user search"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <AdminUserSearchPage
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      users={users}
      isFetching={isFetching}
    />
  );
}
