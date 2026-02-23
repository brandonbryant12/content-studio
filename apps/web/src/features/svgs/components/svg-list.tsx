import { PlusIcon } from '@radix-ui/react-icons';
import { Badge, type BadgeVariant } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { formatDate } from '@/shared/lib/formatters';

type SvgListItem = RouterOutput['svgs']['list'][number];
type SvgStatus = SvgListItem['status'];

const STATUS_CONFIG: Record<
  SvgStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: 'Draft', variant: 'default' },
  generating: { label: 'Generating', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
};

function SvgStatusBadge({ status }: { status: SvgStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className="gap-1.5">
      {status === 'generating' && <Spinner className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

function EmptyState({
  onCreateClick,
  isCreating,
}: {
  onCreateClick: () => void;
  isCreating: boolean;
}) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 19.5h16.5M4.5 4.5h15a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5V6a1.5 1.5 0 011.5-1.5zM9 9l3 2.25L15 9m-6 5.25h6"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">No SVGs yet</h3>
      <p className="empty-state-description">
        Start a conversation and generate your first SVG asset.
      </p>
      <Button onClick={onCreateClick} disabled={isCreating}>
        {isCreating ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Creating...
          </>
        ) : (
          <>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create SVG
          </>
        )}
      </Button>
    </div>
  );
}

function SvgCard({ svg }: { svg: SvgListItem }) {
  const sanitizedPreview = useMemo(
    () =>
      svg.svgContent
        ? DOMPurify.sanitize(svg.svgContent, { USE_PROFILES: { svg: true } })
        : '',
    [svg.svgContent],
  );

  return (
    <div className="content-card group">
      <Link to="/svgs/$svgId" params={{ svgId: svg.id }} className="flex flex-col flex-1">
        <div className="content-card-thumb bg-muted/40">
          {sanitizedPreview ? (
            <div
              className="h-full w-full p-3 flex items-center justify-center [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:max-h-full"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          ) : (
            <div className="content-card-thumb-icon bg-primary/10">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25V6.75zM9 10.5h6M9 13.5h3"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="content-card-body">
          <h3 className="content-card-title">{svg.title?.trim() || 'Untitled'}</h3>
          <div className="content-card-meta">
            <SvgStatusBadge status={svg.status} />
          </div>
        </div>
      </Link>
      <div className="content-card-footer">
        <span className="text-meta">{formatDate(svg.createdAt)}</span>
      </div>
    </div>
  );
}

interface SvgListProps {
  svgs: readonly SvgListItem[];
  isCreating: boolean;
  onCreate: () => void;
}

export function SvgList({ svgs, isCreating, onCreate }: SvgListProps) {
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="page-eyebrow">Visual Content</p>
          <h1 className="page-title">SVG Creator</h1>
        </div>
        <Button onClick={onCreate} disabled={isCreating}>
          {isCreating ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create SVG
            </>
          )}
        </Button>
      </div>

      {svgs.length === 0 ? (
        <EmptyState onCreateClick={onCreate} isCreating={isCreating} />
      ) : (
        <div className="card-grid">
          {svgs.map((svg) => (
            <SvgCard key={svg.id} svg={svg} />
          ))}
        </div>
      )}
    </div>
  );
}
