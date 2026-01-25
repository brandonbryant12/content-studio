// features/documents/index.ts

// Named exports from hooks
export {
  useDocumentList,
  useDocuments,
  useSuspenseDocumentList,
  getDocumentListQueryKey,
  useDocumentsOrdered,
} from './hooks/use-document-list';
export { useOptimisticDeleteDocument } from './hooks/use-optimistic-delete-document';
export {
  useOptimisticUpload,
  fileToBase64,
} from './hooks/use-optimistic-upload';

// Named exports from components
export { DocumentListContainer } from './components/document-list-container';
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
