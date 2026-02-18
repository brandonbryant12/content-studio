import { BookmarkIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { useState, useCallback, type MouseEvent } from 'react';
import type { StyleProperty } from '../hooks/use-infographic-settings';
import {
  useStylePresets,
  useCreateStylePreset,
  useDeleteStylePreset,
} from '../hooks/use-style-presets';
import { STATIC_INFOGRAPHIC_PRESETS } from '../lib/static-presets';

interface PresetPickerProps {
  currentProperties: StyleProperty[];
  onApplyPreset: (properties: StyleProperty[]) => void;
  disabled?: boolean;
}

function ColorDots({ properties }: { properties: readonly StyleProperty[] }) {
  const colors = properties
    .filter((p) => p.type === 'color' && p.value)
    .slice(0, 3);
  if (colors.length === 0) return null;

  return (
    <span className="flex items-center -space-x-0.5 shrink-0">
      {colors.map((c) => (
        <span
          key={c.value}
          className="w-2.5 h-2.5 rounded-full ring-1 ring-background"
          style={{ backgroundColor: c.value }}
        />
      ))}
    </span>
  );
}

function PresetCard({
  name,
  description,
  properties,
  onClick,
  disabled,
}: {
  name: string;
  description?: string;
  properties: readonly StyleProperty[];
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left p-2.5 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
    >
      <div className="flex items-center gap-1.5">
        <ColorDots properties={properties} />
        <span className="text-xs font-medium truncate">{name}</span>
      </div>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
          {description}
        </p>
      )}
    </button>
  );
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
  const serverPresetNames = new Set(
    presets.map((preset) => preset.name.trim().toLowerCase()),
  );
  const examplePresets = STATIC_INFOGRAPHIC_PRESETS.filter(
    (preset) => !serverPresetNames.has(preset.name.trim().toLowerCase()),
  );

  const handleApplyPreset = useCallback(
    (properties: readonly StyleProperty[]) => {
      onApplyPreset([...properties]);
    },
    [onApplyPreset],
  );

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
  }, [
    presetName,
    currentProperties,
    createPreset,
    setSaveDialogOpen,
    setPresetName,
  ]);

  const handleDeletePreset = useCallback(
    (id: string, e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      deletePreset.mutate({ id });
    },
    [deletePreset],
  );

  const hasPresets =
    builtIn.length > 0 || examplePresets.length > 0 || userOwned.length > 0;

  return (
    <>
      <div className="space-y-3">
        {/* Built-in + Example presets as a 2-column grid */}
        {(builtIn.length > 0 || examplePresets.length > 0) && (
          <div className="grid grid-cols-2 gap-1.5">
            {builtIn.map((preset) => (
              <PresetCard
                key={preset.id}
                name={preset.name}
                properties={preset.properties}
                onClick={() => handleApplyPreset(preset.properties)}
                disabled={disabled}
              />
            ))}
            {examplePresets.map((preset) => (
              <PresetCard
                key={preset.id}
                name={preset.name}
                description={preset.description}
                properties={preset.properties}
                onClick={() => handleApplyPreset(preset.properties)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* User-saved presets as pills */}
        {userOwned.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              My Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {userOwned.map((preset) => (
                <div
                  key={preset.id}
                  className="group flex items-center rounded-md border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset.properties)}
                    disabled={disabled}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ColorDots properties={preset.properties} />
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    disabled={deletePreset.isPending}
                    className="px-1.5 py-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors border-l border-border/40"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <Cross2Icon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save current as preset */}
        {hasPresets && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={disabled || currentProperties.length === 0}
            className="text-xs h-7 w-full"
          >
            <BookmarkIcon className="w-3.5 h-3.5 mr-1" />
            Save Current as Preset
          </Button>
        )}

        {!hasPresets && currentProperties.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={disabled}
            className="text-xs h-7 w-full"
          >
            <BookmarkIcon className="w-3.5 h-3.5 mr-1" />
            Save as Preset
          </Button>
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Style Preset</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Presets can be anything: brand rules, layout notes, color tokens,
              or tone directions.
            </p>
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
