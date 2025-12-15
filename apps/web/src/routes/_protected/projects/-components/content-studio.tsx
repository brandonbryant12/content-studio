import {
  FileTextIcon,
  ImageIcon,
  ReaderIcon,
  Share1Icon,
  SpeakerLoudIcon,
  TrashIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import Spinner from '@/routes/-components/common/spinner';

type MediaItem = RouterOutput['projects']['getWithMedia']['media'][number];
type ContentType = 'document' | 'podcast' | 'video' | 'article' | 'social' | 'graphic';

interface MediaTypeConfig {
  label: string;
  description: string;
  acceptsInputFrom: ContentType[];
  canBeInputFor: ContentType[];
  canBeUploaded: boolean;
  canBeGenerated: boolean;
  icon: string;
  gradient: string;
  available: boolean;
}

const MEDIA_TYPE_CONFIG: Record<ContentType, MediaTypeConfig> = {
  document: {
    label: 'Document',
    description: 'Text content from files or AI generation',
    acceptsInputFrom: ['podcast', 'video', 'article'],
    canBeInputFor: ['podcast', 'article', 'graphic', 'video', 'social'],
    canBeUploaded: true,
    canBeGenerated: true,
    icon: 'FileTextIcon',
    gradient: 'from-blue-500 to-indigo-500',
    available: true,
  },
  podcast: {
    label: 'Podcast',
    description: 'AI-generated audio conversations',
    acceptsInputFrom: ['document'],
    canBeInputFor: ['document', 'graphic', 'social', 'video'],
    canBeUploaded: false,
    canBeGenerated: true,
    icon: 'SpeakerLoudIcon',
    gradient: 'from-violet-500 to-fuchsia-500',
    available: true,
  },
  video: {
    label: 'Video',
    description: 'AI-generated video content',
    acceptsInputFrom: ['document', 'podcast', 'graphic'],
    canBeInputFor: ['document', 'social'],
    canBeUploaded: true,
    canBeGenerated: true,
    icon: 'VideoIcon',
    gradient: 'from-blue-500 to-cyan-500',
    available: false,
  },
  article: {
    label: 'Article',
    description: 'AI-generated written content',
    acceptsInputFrom: ['document', 'podcast'],
    canBeInputFor: ['document', 'social', 'graphic'],
    canBeUploaded: false,
    canBeGenerated: true,
    icon: 'ReaderIcon',
    gradient: 'from-emerald-500 to-teal-500',
    available: false,
  },
  social: {
    label: 'Social',
    description: 'Short-form content for social platforms',
    acceptsInputFrom: ['document', 'podcast', 'video', 'article', 'graphic'],
    canBeInputFor: [],
    canBeUploaded: false,
    canBeGenerated: true,
    icon: 'Share1Icon',
    gradient: 'from-pink-500 to-rose-500',
    available: false,
  },
  graphic: {
    label: 'Graphic',
    description: 'AI-generated visual assets',
    acceptsInputFrom: ['document', 'podcast'],
    canBeInputFor: ['video', 'social'],
    canBeUploaded: true,
    canBeGenerated: true,
    icon: 'ImageIcon',
    gradient: 'from-amber-500 to-orange-500',
    available: false,
  },
};

// Map icon names to actual components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileTextIcon,
  SpeakerLoudIcon,
  VideoIcon,
  ReaderIcon,
  Share1Icon,
  ImageIcon,
};

interface ContentStudioProps {
  projectId: string;
  content: MediaItem[];
  selectedSourceIds: Set<string>;
  onCreateContent: (type: ContentType) => void;
  onRemoveMedia: (mediaId: string) => void;
  isRemoving: boolean;
  removingMediaId?: string;
}

interface MediaTypeCardProps {
  config: (typeof MEDIA_TYPE_CONFIG)[ContentType];
  selectedCount: number;
  compatibleCount: number;
  onClick: () => void;
}

function MediaTypeCard({
  config,
  selectedCount,
  compatibleCount,
  onClick,
}: MediaTypeCardProps) {
  const Icon = ICON_MAP[config.icon] ?? FileTextIcon;
  const isAvailable = config.available;

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={cn(
        'relative flex flex-col items-start p-4 rounded-xl border transition-all text-left',
        isAvailable
          ? 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md cursor-pointer'
          : 'border-gray-100 dark:border-gray-900 opacity-60 cursor-not-allowed',
      )}
    >
      {!isAvailable && (
        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          Coming Soon
        </span>
      )}

      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br',
          config.gradient,
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
        {config.label}
      </h3>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {config.description}
      </p>

      {isAvailable && config.acceptsInputFrom.length > 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Accepts:{' '}
          {config.acceptsInputFrom
            .map((t) => MEDIA_TYPE_CONFIG[t].label.toLowerCase())
            .join(', ')}
        </div>
      )}

      {selectedCount > 0 && compatibleCount > 0 && (
        <div className="mt-2 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full">
          {compatibleCount} compatible selected
        </div>
      )}
    </button>
  );
}

interface ContentCardProps {
  item: MediaItem;
  onRemove: () => void;
  isRemoving: boolean;
}

function ContentCard({ item, onRemove, isRemoving }: ContentCardProps) {
  const config = MEDIA_TYPE_CONFIG[item.mediaType as ContentType];
  const Icon = ICON_MAP[config?.icon ?? 'FileTextIcon'] ?? FileTextIcon;

  const title = item.media.title;
  const status =
    item.mediaType === 'document'
      ? `${(item.media as any).wordCount?.toLocaleString() ?? 0} words`
      : (item.media as any).status ?? 'pending';

  // Get source count for lineage display (sources are included in API response)
  const sourceCount = ((item as any).sources as any[] | undefined)?.length ?? 0;

  const card = (
    <div
      className={cn(
        'group relative flex items-start gap-4 p-4 rounded-xl border transition-all',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0',
          config?.gradient ?? 'from-gray-500 to-gray-600',
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
          {config?.label ?? item.mediaType} &middot; {status}
        </p>

        {sourceCount > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Created from {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        disabled={isRemoving}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
      >
        {isRemoving ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <TrashIcon className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  // Only podcasts are linkable for now
  if (item.mediaType === 'podcast') {
    return (
      <Link to="/podcasts/$podcastId" params={{ podcastId: item.mediaId }}>
        {card}
      </Link>
    );
  }

  return card;
}

export function ContentStudio({
  content,
  selectedSourceIds,
  onCreateContent,
  onRemoveMedia,
  isRemoving,
  removingMediaId,
}: ContentStudioProps) {
  // Count compatible selected sources for each media type
  const getCompatibleCount = (targetType: ContentType) => {
    const acceptedTypes = MEDIA_TYPE_CONFIG[targetType].acceptsInputFrom;
    let count = 0;
    for (const item of content) {
      if (
        selectedSourceIds.has(item.mediaId) &&
        acceptedTypes.includes(item.mediaType as ContentType)
      ) {
        count++;
      }
    }
    return count;
  };

  // Filter content to show (all for now, could filter by type)
  const mediaTypes = Object.entries(MEDIA_TYPE_CONFIG) as [
    ContentType,
    (typeof MEDIA_TYPE_CONFIG)[ContentType],
  ][];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Create Content Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Create New Content
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {mediaTypes.map(([type, config]) => (
            <MediaTypeCard
              key={type}
              config={config}
              selectedCount={selectedSourceIds.size}
              compatibleCount={getCompatibleCount(type)}
              onClick={() => onCreateContent(type)}
            />
          ))}
        </div>
      </section>

      {/* All Content Grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          All Content ({content.length})
        </h2>

        {content.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4">
              <FileTextIcon className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
              No content yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Add documents from the sidebar to use as source material, then
              create podcasts and other content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {content.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onRemove={() => onRemoveMedia(item.id)}
                isRemoving={isRemoving && removingMediaId === item.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
