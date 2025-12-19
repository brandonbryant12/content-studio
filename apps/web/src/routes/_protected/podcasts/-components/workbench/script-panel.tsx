import { FileTextIcon, PlusIcon } from '@radix-ui/react-icons';
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
  const isEmpty = segments.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <FileTextIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Script</h2>
            {segments.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {segments.length} segment{segments.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="mr-2 animate-pulse">Unsaved</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-sm shadow-violet-500/25"
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
        <div className="shrink-0 mx-5 mt-5 p-4 bg-gradient-to-br from-violet-50/80 to-fuchsia-50/50 dark:from-violet-950/30 dark:to-fuchsia-950/20 rounded-xl border border-violet-200/60 dark:border-violet-800/40 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Summary
            </p>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-3">{summary}</p>
        </div>
      )}

      {/* Script editor */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-inner">
              <FileTextIcon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No script yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
              Generate a script from your documents or add segments manually.
            </p>
            <Button
              variant="outline"
              onClick={() => onAddSegment(-1, { speaker: 'host', line: '' })}
              className="border-dashed border-2 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
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
