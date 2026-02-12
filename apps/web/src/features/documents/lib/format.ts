export function getFileLabel(source: string): string {
  if (source === 'manual') return 'Text';
  if (source === 'url') return 'URL';
  if (source === 'research') return 'Research';
  if (source.includes('txt')) return 'TXT';
  if (source.includes('pdf')) return 'PDF';
  if (source.includes('docx')) return 'DOCX';
  if (source.includes('pptx')) return 'PPTX';
  return source;
}

export function getFileBadgeClass(source: string): string {
  if (source === 'url') return 'file-badge-url';
  if (source === 'research') return 'file-badge-research';
  if (source.includes('txt')) return 'file-badge-txt';
  if (source.includes('pdf')) return 'file-badge-pdf';
  if (source.includes('docx')) return 'file-badge-docx';
  if (source.includes('pptx')) return 'file-badge-pptx';
  return 'file-badge-default';
}
