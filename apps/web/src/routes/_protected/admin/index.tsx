import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { ActivityDashboardContainer } from '@/features/admin/components/activity-dashboard-container';
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

type AdminTab = 'users' | 'activity';

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');

  useEffect(() => {
    document.title = formatProductPageTitle('Admin');
  }, []);

  return (
    <div className="page-container">
      <div className="mb-8">
        <p className="page-eyebrow">Admin</p>
        <h1 className="page-title">Manage your platform</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Search for users and review their content, or monitor activity across
          the platform.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as AdminTab)}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <AdminUserSearchContainer />
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <ActivityDashboardContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
