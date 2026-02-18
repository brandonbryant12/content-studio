/** Document data for list display */
export interface DocumentListItem {
  id: string;
  title: string;
  source: string;
  status: string;
  wordCount: number;
  originalFileSize: number | null;
  sourceUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}
