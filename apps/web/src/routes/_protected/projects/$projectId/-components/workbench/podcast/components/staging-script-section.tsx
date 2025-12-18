import {
  Pencil1Icon,
  CheckIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { ScriptEditor, type ScriptSegment } from '../script-editor';

interface StagingScriptSectionProps {
  segments: ScriptSegment[];
  summary?: string | null;
  isEditing: boolean;
  isScriptReady: boolean;
  isSaving: boolean;
  editedSegments: ScriptSegment[];
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveScript: () => void;
  onSegmentsChange: (segments: ScriptSegment[]) => void;
}

export function StagingScriptSection({
  segments,
  summary,
  isEditing,
  isScriptReady,
  isSaving,
  editedSegments,
  onStartEditing,
  onCancelEditing,
  onSaveScript,
  onSegmentsChange,
}: StagingScriptSectionProps) {
  return (
    <div className="mb-6 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Script
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {segments.length} segments
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEditing}
                disabled={isSaving}
              >
                <Cross2Icon className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSaveScript}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner className="w-4 h-4 mr-1" />
                ) : (
                  <CheckIcon className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
            </>
          ) : isScriptReady ? (
            <Button variant="outline" size="sm" onClick={onStartEditing}>
              <Pencil1Icon className="w-4 h-4 mr-1" />
              Edit Script
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
        <ScriptEditor
          segments={isEditing ? editedSegments : segments}
          onChange={onSegmentsChange}
          readOnly={!isEditing}
          summary={summary}
        />
      </div>
    </div>
  );
}
