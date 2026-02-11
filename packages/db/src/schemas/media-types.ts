import { pgEnum } from 'drizzle-orm/pg-core';

export const contentTypeEnum = pgEnum('content_type', [
  'document',
  'podcast',
  'video',
  'article',
  'social',
  'graphic',
]);

export type ContentType = (typeof contentTypeEnum.enumValues)[number];

export interface MediaTypeConfig {
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

export const MEDIA_TYPE_CONFIG: Record<ContentType, MediaTypeConfig> = {
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
} as const;

export function canBeSourceFor(
  sourceType: ContentType,
  targetType: ContentType,
): boolean {
  return MEDIA_TYPE_CONFIG[targetType].acceptsInputFrom.includes(sourceType);
}

export function getAcceptedSourceTypes(targetType: ContentType): ContentType[] {
  return MEDIA_TYPE_CONFIG[targetType].acceptsInputFrom;
}

export function getTargetTypes(sourceType: ContentType): ContentType[] {
  return MEDIA_TYPE_CONFIG[sourceType].canBeInputFor;
}

export function getAvailableMediaTypes(): ContentType[] {
  return (Object.keys(MEDIA_TYPE_CONFIG) as ContentType[]).filter(
    (type) => MEDIA_TYPE_CONFIG[type].available,
  );
}
