// features/infographics/components/workbench/ai-suggestions-panel.tsx

import {
  ChevronDownIcon,
  LightningBoltIcon,
  PlusIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useState } from 'react';
import type { KeyPointSuggestion } from '../../hooks/use-ai-extraction';

export interface AISuggestionsPanelProps {
  /** Document IDs to extract from */
  documentIds: string[];
  /** Callback when extract is triggered */
  onExtract: () => void;
  /** Whether extraction is in progress */
  isExtracting: boolean;
  /** Extracted suggestions */
  suggestions: KeyPointSuggestion[];
  /** Callback when a suggestion is added */
  onAddSuggestion: (suggestion: KeyPointSuggestion) => void;
  /** Callback when all high-relevance suggestions are added */
  onAddAllHigh: () => void;
  /** Map of document IDs to titles */
  documentTitles: Record<string, string>;
  /** Whether the panel is disabled */
  disabled?: boolean;
}

/**
 * Collapsible panel for AI-powered key point extraction.
 * Shows extracted suggestions with relevance indicators.
 */
export function AISuggestionsPanel({
  documentIds,
  onExtract,
  isExtracting,
  suggestions,
  onAddSuggestion,
  onAddAllHigh,
  documentTitles,
  disabled = false,
}: AISuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const highRelevanceSuggestions = suggestions.filter(
    (s) => s.relevance === 'high',
  );

  const canExtract = documentIds.length > 0 && !isExtracting && !disabled;

  return (
    <div className="ai-suggestions-panel">
      {/* Header with expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="ai-suggestions-header"
      >
        <div className="ai-suggestions-header-title">
          <LightningBoltIcon className="w-4 h-4 text-purple-500" />
          <span>AI Suggestions</span>
          {suggestions.length > 0 && (
            <span className="ai-suggestions-count">{suggestions.length}</span>
          )}
        </div>
        <ChevronDownIcon
          className={`ai-suggestions-chevron ${isExpanded ? 'expanded' : ''}`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="ai-suggestions-content">
          {/* Extract button */}
          <div className="ai-suggestions-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={onExtract}
              disabled={!canExtract}
              className="ai-suggestions-extract-btn"
            >
              {isExtracting ? (
                <>
                  <Spinner className="w-3.5 h-3.5 mr-1.5" />
                  Extracting...
                </>
              ) : (
                <>
                  <LightningBoltIcon className="w-3.5 h-3.5 mr-1.5" />
                  Extract Key Points
                </>
              )}
            </Button>

            {highRelevanceSuggestions.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddAllHigh}
                disabled={disabled}
              >
                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                Add All High ({highRelevanceSuggestions.length})
              </Button>
            )}
          </div>

          {/* Suggestions list */}
          {suggestions.length > 0 ? (
            <div className="ai-suggestions-list">
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={index}
                  suggestion={suggestion}
                  documentTitle={
                    documentTitles[suggestion.documentId] ?? 'Unknown'
                  }
                  onAdd={() => onAddSuggestion(suggestion)}
                  disabled={disabled}
                />
              ))}
            </div>
          ) : !isExtracting ? (
            <div className="ai-suggestions-empty">
              <p className="text-sm text-muted-foreground">
                Click "Extract Key Points" to analyze your documents and find
                relevant content for your infographic.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface SuggestionItemProps {
  suggestion: KeyPointSuggestion;
  documentTitle: string;
  onAdd: () => void;
  disabled: boolean;
}

function SuggestionItem({
  suggestion,
  documentTitle,
  onAdd,
  disabled,
}: SuggestionItemProps) {
  const isHigh = suggestion.relevance === 'high';

  return (
    <div className={`ai-suggestion-item ${isHigh ? 'high' : 'medium'}`}>
      {/* Relevance indicator */}
      <div
        className={`ai-suggestion-relevance ${isHigh ? 'high' : 'medium'}`}
        title={`${isHigh ? 'High' : 'Medium'} relevance`}
      >
        {isHigh ? 'H' : 'M'}
      </div>

      {/* Content */}
      <div className="ai-suggestion-content">
        <p className="ai-suggestion-text">{suggestion.text}</p>
        <div className="ai-suggestion-meta">
          <FileTextIcon className="w-3 h-3" />
          <span>{documentTitle}</span>
        </div>
      </div>

      {/* Add button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onAdd}
        disabled={disabled}
        className="ai-suggestion-add"
      >
        <PlusIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
