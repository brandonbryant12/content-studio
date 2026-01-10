// features/infographics/components/workbench/workbench-layout.tsx

import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import type { ReactNode } from 'react';
import { getStatusConfig, isGeneratingStatus } from '../../lib/status';
import { InfographicIcon } from '../infographic-icon';

type InfographicFull = RouterOutput['infographics']['get'];

/**
 * Infographic type display names.
 * Matches INFOGRAPHIC_TYPES from @repo/media.
 */
const INFOGRAPHIC_TYPE_NAMES: Record<string, string> = {
  timeline: 'Timeline',
  comparison: 'Comparison',
  statistical: 'Statistical',
  process: 'Process Flow',
  list: 'List',
  mindMap: 'Mind Map',
  hierarchy: 'Hierarchy',
  geographic: 'Geographic',
};

export interface InfographicWorkbenchLayoutProps {
  infographic: InfographicFull;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  actionBar?: ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Workbench layout for the infographic detail view.
 * Two-panel layout with header and action bar.
 *
 * - Header: back button, icon, title, status badge, type badge, delete button
 * - Main: left panel (document content + selections), right panel (settings + preview)
 * - Footer: action bar for generation controls
 */
export function InfographicWorkbenchLayout({
  infographic,
  leftPanel,
  rightPanel,
  actionBar,
  onDelete,
  isDeleting,
}: InfographicWorkbenchLayoutProps) {
  const statusConfig = getStatusConfig(infographic.status);
  const isGenerating = isGeneratingStatus(infographic.status);
  const typeName =
    INFOGRAPHIC_TYPE_NAMES[infographic.infographicType] ??
    infographic.infographicType;

  return (
    <div className="workbench">
      {/* Header */}
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            {/* Back button */}
            <Link
              to="/infographics"
              className="workbench-back-btn"
              aria-label="Back to infographics"
            >
              <ArrowLeftIcon />
            </Link>

            {/* Infographic icon and title */}
            <div className="workbench-title-group">
              <InfographicIcon
                infographicType={infographic.infographicType}
                status={infographic.status}
              />
              <div className="min-w-0">
                <h1 className="workbench-title">{infographic.title}</h1>
                <p className="workbench-subtitle">{typeName}</p>
              </div>
            </div>

            {/* Status badges and metadata */}
            <div className="workbench-meta">
              {statusConfig && (
                <Badge
                  variant={statusConfig.badgeVariant}
                  className="gap-1.5 px-2.5 py-1 font-medium"
                >
                  {isGenerating && <Spinner className="w-3 h-3" />}
                  {statusConfig.label}
                </Badge>
              )}

              {/* Aspect ratio indicator */}
              <div className="workbench-aspect-ratio">
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
                <span className="text-sm text-muted-foreground">
                  {infographic.aspectRatio}
                </span>
              </div>

              {/* Delete button */}
              <div className="workbench-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  disabled={isDeleting || isGenerating}
                  className="workbench-delete-btn"
                  aria-label="Delete infographic"
                >
                  {isDeleting ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - split panels */}
      <div className="workbench-main">
        {/* Left panel - Document content + selections */}
        <div className="workbench-panel-left">{leftPanel}</div>

        {/* Right panel - Settings + preview */}
        <div className="workbench-panel-right">{rightPanel}</div>
      </div>

      {/* Global Action Bar */}
      {actionBar}
    </div>
  );
}
