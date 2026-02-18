import { BookmarkIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Input } from '@repo/ui/components/input';
import { useState, useCallback } from 'react';
import type { StyleProperty } from '../hooks/use-infographic-settings';
import {
  useStylePresets,
  useCreateStylePreset,
  useDeleteStylePreset,
} from '../hooks/use-style-presets';

interface PresetPickerProps {
  currentProperties: StyleProperty[];
  onApplyPreset: (properties: StyleProperty[]) => void;
  disabled?: boolean;
}

export function PresetPicker({
  currentProperties,
  onApplyPreset,
  disabled,
}: PresetPickerProps) {
  const { data: presets = [] } = useStylePresets();
  const createPreset = useCreateStylePreset();
  const deletePreset = useDeleteStylePreset();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const builtIn = presets.filter((p) => p.isBuiltIn);
  const userOwned = presets.filter((p) => !p.isBuiltIn);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    createPreset.mutate(
      { name: presetName.trim(), properties: currentProperties },
      {
        onSuccess: () => {
          setSaveDialogOpen(false);
          setPresetName('');
        },
      },
    );
  }, [presetName, currentProperties, createPreset]);

  const handleDeletePreset = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deletePreset.mutate({ id: id as never });
    },
    [deletePreset],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="text-xs h-7"
          >
            <BookmarkIcon className="w-3.5 h-3.5 mr-1" />
            Presets
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {builtIn.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs">
                Built-in
              </DropdownMenuLabel>
              {builtIn.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() =>
                    onApplyPreset(preset.properties as StyleProperty[])
                  }
                  className="text-xs"
                >
                  {preset.name}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {userOwned.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">
                My Presets
              </DropdownMenuLabel>
              {userOwned.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() =>
                    onApplyPreset(preset.properties as StyleProperty[])
                  }
                  className="text-xs flex items-center justify-between"
                >
                  <span>{preset.name}</span>
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="text-muted-foreground hover:text-destructive ml-2"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSaveDialogOpen(true)}
            disabled={currentProperties.length === 0}
            className="text-xs"
          >
            Save Current as Preset...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Style Preset</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePreset();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSavePreset}
              disabled={!presetName.trim() || createPreset.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
