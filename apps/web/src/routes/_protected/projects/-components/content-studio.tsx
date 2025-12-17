import {
  FileTextIcon,
  ImageIcon,
  ReaderIcon,
  Share1Icon,
  SpeakerLoudIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';

type Document = RouterOutput['projects']['get']['documents'][number];
type OutputCounts = RouterOutput['projects']['get']['outputCounts'];
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
  documents: Document[];
  outputCounts: OutputCounts;
  selectedSourceIds: Set<string>;
  onCreateContent: (type: ContentType) => void;
}

interface MediaTypeCardProps {
  config: (typeof MEDIA_TYPE_CONFIG)[ContentType];
  selectedCount: number;
  compatibleCount: number;
  outputCount?: number;
  onClick: () => void;
}

function MediaTypeCard({
  config,
  selectedCount,
  compatibleCount,
  outputCount,
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

      {outputCount !== undefined && outputCount > 0 && (
        <span className="absolute top-2 right-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
          {outputCount} created
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

interface DocumentCardProps {
  document: Document;
}

function DocumentCard({ document }: DocumentCardProps) {
  return (
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
          'from-blue-500 to-indigo-500',
        )}
      >
        <FileTextIcon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
          {document.title}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Document &middot; {document.wordCount.toLocaleString()} words
        </p>
      </div>
    </div>
  );
}

export function ContentStudio({
  projectId,
  documents,
  outputCounts,
  selectedSourceIds,
  onCreateContent,
}: ContentStudioProps) {
  // Count compatible selected sources for each media type
  const getCompatibleCount = (targetType: ContentType) => {
    const acceptedTypes = MEDIA_TYPE_CONFIG[targetType].acceptsInputFrom;
    // Documents are the only source type in projects now
    if (acceptedTypes.includes('document')) {
      return selectedSourceIds.size;
    }
    return 0;
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
              outputCount={type === 'podcast' ? outputCounts.podcasts : undefined}
              onClick={() => onCreateContent(type)}
            />
          ))}
        </div>
      </section>

      {/* Source Documents Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Source Documents ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4">
              <FileTextIcon className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
              No documents yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Add documents from the sidebar to use as source material, then
              create podcasts and other content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}

        {/* Output counts summary */}
        {outputCounts.podcasts > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Generated Content
            </h3>
            <div className="flex gap-4">
              <Link
                to="/projects/$projectId/podcasts"
                params={{ projectId }}
                className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                <SpeakerLoudIcon className="w-4 h-4" />
                {outputCounts.podcasts} podcast{outputCounts.podcasts !== 1 ? 's' : ''}
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
