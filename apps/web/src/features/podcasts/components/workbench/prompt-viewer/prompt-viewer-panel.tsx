import {
  Cross2Icon,
  CodeIcon,
  ChatBubbleIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { useRef, useEffect } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { PromptSection } from './prompt-section';
import { SourceContentViewer } from './source-content-viewer';

type GenerationContext = NonNullable<
  RouterOutput['podcasts']['get']['generationContext']
>;

interface PromptViewerPanelProps {
  generationContext: GenerationContext;
  userId?: string;
  onClose: () => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PromptViewerPanel({
  generationContext,
  userId,
  onClose,
}: PromptViewerPanelProps) {
  const {
    systemPromptTemplate,
    userInstructions,
    sourceEntries,
    modelId,
    modelParams,
    generatedAt,
  } = generationContext;

  const hasUserInstructions =
    userInstructions && userInstructions.trim().length > 0;

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  return (
    <div
      ref={overlayRef}
      className="prompt-viewer-overlay"
      tabIndex={-1}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="prompt-viewer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="prompt-viewer-panel">
        <div className="prompt-viewer-header">
          <h3 className="prompt-viewer-title">Generation Details</h3>
          <button
            onClick={onClose}
            className="prompt-viewer-close"
            aria-label="Close prompt viewer"
          >
            <Cross2Icon />
          </button>
        </div>

        <div className="prompt-viewer-content">
          {/* Generation Meta - Always Visible */}
          <div className="prompt-meta">
            <div className="prompt-meta-row">
              <span className="prompt-meta-label">Model</span>
              <span className="prompt-meta-value">{modelId}</span>
            </div>
            {modelParams?.temperature != null && (
              <div className="prompt-meta-row">
                <span className="prompt-meta-label">Temperature</span>
                <span className="prompt-meta-value">
                  {modelParams.temperature}
                </span>
              </div>
            )}
            <div className="prompt-meta-row">
              <span className="prompt-meta-label">Generated</span>
              <span className="prompt-meta-value">
                {formatDate(generatedAt)}
              </span>
            </div>
          </div>

          {/* System Prompt Section */}
          <PromptSection
            icon={<CodeIcon />}
            title="System Prompt"
            defaultOpen={false}
          >
            <pre className="prompt-code">{systemPromptTemplate}</pre>
          </PromptSection>

          {/* User Instructions Section - Only if present */}
          {hasUserInstructions && (
            <PromptSection
              icon={<ChatBubbleIcon />}
              title="Custom Instructions"
              defaultOpen={true}
            >
              <pre className="prompt-code">{userInstructions}</pre>
            </PromptSection>
          )}

          {/* Source Content Section */}
          <PromptSection
            icon={<FileTextIcon />}
            title="Sources"
            badge={
              <span className="prompt-section-badge">
                {sourceEntries.length}
              </span>
            }
            defaultOpen={false}
          >
            <div className="prompt-documents">
              {sourceEntries.map((entry: { id: string; title: string }) => (
                <SourceContentViewer
                  key={entry.id}
                  sourceId={entry.id}
                  sourceTitle={entry.title}
                  userId={userId}
                />
              ))}
            </div>
          </PromptSection>
        </div>
      </div>
    </div>
  );
}
