import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/_protected/admin/activity')({
  component: ActivityRedirectPage,
});

function ActivityRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: '/admin', replace: true });
  }, [navigate]);

  return null;
}
