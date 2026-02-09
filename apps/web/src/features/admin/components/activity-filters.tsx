import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';

interface TopUser {
  readonly userId: string;
  readonly userName: string;
  readonly count: number;
}

interface ActivityFiltersProps {
  entityType: string | undefined;
  onEntityTypeChange: (value: string | undefined) => void;
  action: string | undefined;
  onActionChange: (value: string | undefined) => void;
  userId: string | undefined;
  onUserIdChange: (value: string | undefined) => void;
  topUsers: readonly TopUser[];
}

const ENTITY_TYPES = [
  { value: 'document', label: 'Documents' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'voiceover', label: 'Voiceovers' },
  { value: 'infographic', label: 'Infographics' },
];

const ACTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'generated_script', label: 'Generated Script' },
  { value: 'generated_audio', label: 'Generated Audio' },
  { value: 'generated_voiceover', label: 'Generated Voiceover' },
  { value: 'generated_infographic', label: 'Generated Infographic' },
];

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select.Root
        value={value ?? '__all__'}
        onValueChange={(v) => onValueChange(v === '__all__' ? undefined : v)}
      >
        <Select.Trigger
          className="inline-flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[140px]"
          aria-label={label}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="overflow-hidden rounded-md border border-border bg-popover shadow-md z-50">
            <Select.Viewport className="p-1">
              <SelectItem value="__all__">All</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function SelectItem({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  return (
    <Select.Item
      value={value}
      className="relative flex items-center rounded-sm px-6 py-1.5 text-sm text-foreground cursor-pointer select-none hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <Select.ItemIndicator className="absolute left-1.5 flex items-center">
        <CheckIcon className="w-3.5 h-3.5" />
      </Select.ItemIndicator>
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}

export function ActivityFilters({
  entityType,
  onEntityTypeChange,
  action,
  onActionChange,
  userId,
  onUserIdChange,
  topUsers,
}: ActivityFiltersProps) {
  const userOptions = topUsers.map((u) => ({
    value: u.userId,
    label: `${u.userName} (${u.count})`,
  }));

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <FilterSelect
        label="Entity Type"
        value={entityType}
        onValueChange={onEntityTypeChange}
        options={ENTITY_TYPES}
        placeholder="All types"
      />
      <FilterSelect
        label="Action"
        value={action}
        onValueChange={onActionChange}
        options={ACTIONS}
        placeholder="All actions"
      />
      {userOptions.length > 0 && (
        <FilterSelect
          label="User"
          value={userId}
          onValueChange={onUserIdChange}
          options={userOptions}
          placeholder="All users"
        />
      )}
    </div>
  );
}
