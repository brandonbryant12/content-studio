import { ChevronDownIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { DocumentStatus } from '@repo/api/contracts';
import { type CSSProperties, useState } from 'react';
import type { DocumentDetailDocument } from './document-detail-types';
import { getFileBadgeClass, getFileLabel } from '../lib/format';
import { formatDate, formatFileSize } from '@/shared/lib/formatters';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SourceFavicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <svg
        className="w-3.5 h-3.5 text-muted-foreground"
        viewBox="0 0 15 15"
        fill="currentColor"
      >
        <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM1.197 7.5a6.303 6.303 0 1 1 12.606 0 6.303 6.303 0 0 1-12.606 0Z" />
      </svg>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      width={14}
      height={14}
      className="rounded-sm"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function ResearchCallout({
  config,
}: {
  config: NonNullable<DocumentDetailDocument['researchConfig']>;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const sources = config.sources ?? [];
  const sourceCount = sources.length || config.sourceCount || 0;
  const outlineSections = config.outline?.sections ?? [];

  return (
    <div className="research-callout mb-8">
      <div className="research-callout-header">
        <div className="research-callout-icon" aria-hidden="true">
          <MagnifyingGlassIcon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="research-callout-label">Research topic</span>
          <p className="research-callout-query">{config.query}</p>
        </div>
      </div>

      {sourceCount > 0 && (
        <div className="research-sources-section">
          <button
            type="button"
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="research-sources-toggle"
            aria-expanded={sourcesOpen}
          >
            <span className="research-sources-count">
              {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sourcesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {sourcesOpen && sources.length > 0 && (
            <ul className="research-sources-list" role="list">
              {sources.map((source, i) => (
                <li
                  key={source.url}
                  className="research-source-item [animation-delay:var(--delay)]"
                  style={{ '--delay': `${i * 30}ms` } as CSSProperties}
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="research-source-link"
                  >
                    <span
                      className="research-source-favicon"
                      aria-hidden="true"
                    >
                      <SourceFavicon domain={extractDomain(source.url)} />
                    </span>
                    <span className="research-source-info">
                      <span className="research-source-title">
                        {source.title}
                      </span>
                      <span className="research-source-domain">
                        {extractDomain(source.url)}
                      </span>
                    </span>
                    <svg
                      className="research-source-arrow"
                      viewBox="0 0 15 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 2.5h9v9M12 3 3.5 11.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {outlineSections.length > 0 && (
        <div className="research-sources-section border-t border-border/40 mt-4 pt-3">
          <button
            type="button"
            onClick={() => setOutlineOpen(!outlineOpen)}
            className="research-sources-toggle"
            aria-expanded={outlineOpen}
          >
            <span className="research-sources-count">
              {outlineSections.length}{' '}
              {outlineSections.length === 1
                ? 'outline section'
                : 'outline sections'}
            </span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${outlineOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {outlineOpen && (
            <ul className="research-sources-list" role="list">
              {outlineSections.map((section, index) => (
                <li
                  key={`${section.heading}-${index}`}
                  className="research-source-item [animation-delay:var(--delay)]"
                  style={{ '--delay': `${index * 30}ms` } as CSSProperties}
                >
                  <div className="flex flex-col gap-1.5 text-sm">
                    <p className="font-medium text-foreground">
                      {section.heading}
                    </p>
                    <p className="text-muted-foreground">{section.summary}</p>
                    {section.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {section.citations.map((citation) => (
                          <a
                            key={`${section.heading}-${citation}`}
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/50"
                          >
                            {extractDomain(citation)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function estimateReadTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min read`;
}

export function DocumentMetadataBar({
  document,
}: {
  document: DocumentDetailDocument;
}) {
  return (
    <div className="doc-meta-bar">
      <span className={getFileBadgeClass(document.source)}>
        {getFileLabel(document.source)}
      </span>

      <span className="doc-meta-separator" aria-hidden="true" />

      {document.status === DocumentStatus.READY && (
        <>
          <span className="doc-meta-item">
            {document.wordCount.toLocaleString()} words
          </span>
          <span className="doc-meta-separator" aria-hidden="true" />
          <span className="doc-meta-item">
            {estimateReadTime(document.wordCount)}
          </span>
        </>
      )}

      {document.originalFileSize && (
        <>
          <span className="doc-meta-separator" aria-hidden="true" />
          <span className="doc-meta-item">
            {formatFileSize(document.originalFileSize)}
          </span>
        </>
      )}

      {document.originalFileName && (
        <>
          <span className="doc-meta-separator" aria-hidden="true" />
          <span
            className="doc-meta-item truncate max-w-[200px]"
            title={document.originalFileName}
          >
            {document.originalFileName}
          </span>
        </>
      )}

      <span className="doc-meta-separator" aria-hidden="true" />
      <span
        className="doc-meta-item"
        title={`Created: ${formatDateTime(document.createdAt)}`}
      >
        {formatDate(document.createdAt)}
      </span>
      {document.updatedAt !== document.createdAt && (
        <span
          className="doc-meta-item italic"
          title={`Updated: ${formatDateTime(document.updatedAt)}`}
        >
          (edited)
        </span>
      )}
    </div>
  );
}

export function DocumentSourceCallout({
  document,
}: {
  document: DocumentDetailDocument;
}) {
  if (document.source === 'url' && document.sourceUrl) {
    const domain = extractDomain(document.sourceUrl);
    return (
      <div className="doc-url-callout">
        <div className="doc-url-callout-accent" aria-hidden="true" />
        <div className="doc-url-callout-body">
          <div className="doc-url-callout-header">
            <span className="doc-url-callout-favicon" aria-hidden="true">
              <SourceFavicon domain={domain} />
            </span>
            <span className="doc-url-callout-domain">{domain}</span>
            <span className="doc-url-callout-date">
              {formatDate(document.createdAt)}
            </span>
          </div>
          <a
            href={document.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="doc-url-callout-link"
          >
            {document.sourceUrl}
            <svg
              className="doc-url-callout-arrow"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d="M3.5 2.5h9v9M12 3 3.5 11.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  if (document.source === 'research' && document.researchConfig) {
    return <ResearchCallout config={document.researchConfig} />;
  }

  return null;
}
