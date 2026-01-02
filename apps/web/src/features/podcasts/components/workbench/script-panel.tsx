import {
  ChevronDownIcon,
  FileTextIcon,
  LockClosedIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { useState } from 'react';
import type { ScriptSegment } from '../../hooks';
import { ScriptEditor } from './script-editor';

interface ScriptPanelProps {
  segments: ScriptSegment[];
  summary: string | null;
  hasChanges: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
  onReorderSegments: (fromIndex: number, toIndex: number) => void;
  onAddSegment: (
    afterIndex: number,
    data: Omit<ScriptSegment, 'index'>,
  ) => void;
  onDiscard: () => void;
}

export function ScriptPanel({
  segments,
  summary,
  hasChanges,
  isSaving,
  disabled,
  onUpdateSegment,
  onRemoveSegment,
  onReorderSegments,
  onAddSegment,
  onDiscard,
}: ScriptPanelProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const isEmpty = segments.length === 0;

  return (
    <div className="script-panel">
      {/* Panel header */}
      <div className="script-panel-header">
        <div className="script-panel-title-group">
          <div className="script-panel-icon">
            <FileTextIcon />
          </div>
          <div>
            <h2 className="script-panel-title">Script</h2>
            {disabled ? (
              <span className="script-edit-hint locked">
                <LockClosedIcon className="w-3 h-3 mr-1" />
                Editing locked during generation
              </span>
            ) : (
              segments.length > 0 && (
                <span className="script-edit-hint">Click any line to edit</span>
              )
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="script-panel-actions">
            <Badge variant="warning" className="mr-2 animate-pulse">
              Unsaved
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Discard
            </Button>
          </div>
        )}
      </div>

      {/* Script editor */}
      <div className="script-panel-content">
        {/* Summary */}
        {summary && (
          <div className="script-summary">
            <button
              type="button"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="script-summary-toggle"
            >
              <div className="script-summary-label">
                <div className="script-summary-indicator" />
                <p className="script-summary-text">Summary</p>
              </div>
              <ChevronDownIcon
                className={`script-summary-chevron ${summaryExpanded ? 'expanded' : ''}`}
              />
            </button>
            {summaryExpanded && (
              <p className="script-summary-content">{summary}</p>
            )}
          </div>
        )}
        {isEmpty ? (
          <div className="script-empty">
            <div className="script-empty-icon">
              <FileTextIcon />
            </div>
            <h3 className="script-empty-title">No script yet</h3>
            <p className="script-empty-description">
              Generate a script from your documents or add segments manually.
            </p>
            <Button
              variant="outline"
              onClick={() => onAddSegment(-1, { speaker: 'host', line: '' })}
              className="script-empty-btn"
              disabled={disabled}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add First Segment
            </Button>
          </div>
        ) : (
          <ScriptEditor
            segments={segments}
            disabled={disabled}
            onUpdateSegment={onUpdateSegment}
            onRemoveSegment={onRemoveSegment}
            onReorderSegments={onReorderSegments}
            onAddSegment={onAddSegment}
          />
        )}
      </div>
    </div>
  );
}
