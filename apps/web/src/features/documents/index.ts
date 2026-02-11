// Named exports from hooks
export {
  useDocumentList,
  useDocuments,
  useSuspenseDocumentList,
  getDocumentListQueryKey,
  useDocumentsOrdered,
} from './hooks/use-document-list';
export { useDocument, useDocumentContent } from './hooks/use-document';
export { useDocumentActions } from './hooks/use-document-actions';
export type { UseDocumentActionsReturn } from './hooks/use-document-actions';
export { useOptimisticDeleteDocument } from './hooks/use-optimistic-delete-document';
export {
  useOptimisticUpload,
  fileToBase64,
} from './hooks/use-optimistic-upload';

// Named exports from components
export { DocumentListContainer } from './components/document-list-container';
export { DocumentDetailContainer } from './components/document-detail-container';
export {
  DocumentDetail,
  type DocumentDetailProps,
} from './components/document-detail';
export {
  DocumentList,
  type DocumentListProps,
} from './components/document-list';
export {
  DocumentItem,
  type DocumentListItem,
  type DocumentItemProps,
} from './components/document-item';
export { DocumentIcon } from './components/document-icon';
export { UploadDocumentDialog } from './components/upload-document-dialog';
