import { ChevronDownIcon, FileTextIcon, PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { ScriptSegment } from '@/hooks/use-script-editor';
import { ScriptEditor } from './script-editor';

interface ScriptPanelProps {
  segments: ScriptSegment[];
  summary: string | null;
  hasChanges: boolean;
  isSaving: boolean;
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
  onReorderSegments: (fromIndex: number, toIndex: number) => void;
  onAddSegment: (afterIndex: number, data: Omit<ScriptSegment, 'index'>) => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function ScriptPanel({
  segments,
  summary,
  hasChanges,
  isSaving,
  onUpdateSegment,
  onRemoveSegment,
  onReorderSegments,
  onAddSegment,
  onSave,
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
            {segments.length > 0 && (
              <p className="script-panel-count">
                {segments.length} segment{segments.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="script-panel-actions">
            <Badge variant="warning" className="mr-2 animate-pulse">Unsaved</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="script-panel-save-btn"
            >
              {isSaving ? (
                <>
                  <Spinner className="w-3 h-3 mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </div>

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

      {/* Script editor */}
      <div className="script-panel-content">
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
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add First Segment
            </Button>
          </div>
        ) : (
          <ScriptEditor
            segments={segments}
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
