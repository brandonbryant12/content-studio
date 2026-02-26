import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';

export interface StatCardProps {
  label: string;
  linkTo: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  count: number;
  isLoading: boolean;
}

export function StatCard({
  label,
  linkTo,
  icon: Icon,
  iconBg,
  iconColor,
  count,
  isLoading,
}: StatCardProps) {
  return (
    <Link to={linkTo} className="stat-card group">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${iconBg}`}>
          <Icon className={iconColor} />
        </div>
      </div>
      <span className="stat-card-value">
        {isLoading ? <Spinner className="w-5 h-5" /> : count}
      </span>
    </Link>
  );
}
