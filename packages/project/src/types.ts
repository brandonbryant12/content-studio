import type { Document, Podcast, Project, ProjectDocument } from '@repo/db/schema';

/**
 * A project with its linked documents (source content).
 */
export interface ProjectWithDocuments extends Project {
  documents: ProjectDocument[];
}

/**
 * A project with fully resolved documents and output counts.
 */
export interface ProjectFull extends Project {
  documents: Document[];
  outputCounts: {
    podcasts: number;
  };
}

/**
 * Input for adding a document to a project.
 */
export interface AddDocumentInput {
  documentId: string;
  order?: number;
}

// Re-export types for convenience
export type { Project, ProjectDocument, Document, Podcast } from '@repo/db/schema';
