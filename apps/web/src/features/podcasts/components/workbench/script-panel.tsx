import {
  ChevronDownIcon,
  FileTextIcon,
  LockClosedIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { useState, useCallback } from 'react';
import type { ScriptSegment } from '../../hooks/use-script-editor';
import { ScriptEditor } from './script-editor';

interface ScriptPanelProps {
  segments: ScriptSegment[];
  summary: string | null;
  hasChanges: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onUpdateSegment: (index: number, data: Partial<ScriptSegment>) => void;
  onRemoveSegment: (index: number) => void;
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
  onAddSegment,
  onDiscard,
}: ScriptPanelProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const isEmpty = segments.length === 0;

  const toggleSummary = useCallback(() => {
    setSummaryExpanded((prev) => !prev);
  }, []);

  const handleAddFirst = useCallback(() => {
    onAddSegment(-1, { speaker: 'host', line: '' });
  }, [onAddSegment]);

  return (
    <div className="script-panel-v2">
      {/* Floating status bar - only shows when there are changes or locked */}
      {(hasChanges || disabled) && (
        <div className={`script-status-bar ${disabled ? 'locked' : 'unsaved'}`}>
          {disabled ? (
            <>
              <LockClosedIcon className="w-3.5 h-3.5" />
              <span>Editing locked during generation</span>
            </>
          ) : (
            <>
              <Badge variant="warning" className="animate-pulse">
                Unsaved changes
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={isSaving}
                className="script-status-discard"
              >
                Discard
              </Button>
            </>
          )}
        </div>
      )}

      {/* Script content - full width scroll, centered inner content */}
      <div className="script-panel-v2-scroll">
        <div className="script-panel-v2-inner">
          {/* Collapsible summary - minimal */}
          {summary && (
            <div className="script-summary-v2">
              <button
                type="button"
                onClick={toggleSummary}
                className="script-summary-v2-toggle"
              >
                <span className="script-summary-v2-label">Summary</span>
                <ChevronDownIcon
                  className={`script-summary-v2-icon ${summaryExpanded ? 'expanded' : ''}`}
                />
              </button>
              {summaryExpanded && (
                <p className="script-summary-v2-text">{summary}</p>
              )}
            </div>
          )}

          {/* Main editor area */}
          {isEmpty ? (
            <div className="script-empty-v2">
              <div className="script-empty-v2-icon">
                <FileTextIcon />
              </div>
              <h3 className="script-empty-v2-title">Start your script</h3>
              <p className="script-empty-v2-desc">
                Add your first line or generate from documents
              </p>
              <Button
                variant="outline"
                onClick={handleAddFirst}
                className="script-empty-v2-btn"
                disabled={disabled}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add first line</span>
              </Button>
            </div>
          ) : (
            <ScriptEditor
              segments={segments}
              disabled={disabled}
              onUpdateSegment={onUpdateSegment}
              onRemoveSegment={onRemoveSegment}
              onAddSegment={onAddSegment}
            />
          )}
        </div>
      </div>
    </div>
  );
}
