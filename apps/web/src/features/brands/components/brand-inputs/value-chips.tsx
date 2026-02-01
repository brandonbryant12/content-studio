// features/brands/components/brand-inputs/value-chips.tsx

import {
  memo,
  useState,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';

interface ValueChipsProps {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  maxValues?: number;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Editable chip/badge list for values like brand values, benefits, etc.
 * Supports adding via input field or clicking suggestions.
 */
export const ValueChips = memo(function ValueChips({
  values,
  onChange,
  suggestions = [],
  maxValues = 5,
  placeholder = 'Add a value...',
  label,
  disabled,
}: ValueChipsProps) {
  const [inputValue, setInputValue] = useState('');

  const canAdd = values.length < maxValues;
  const remainingSlots = maxValues - values.length;

  const addValue = useCallback(
    (newValue: string) => {
      const trimmed = newValue.trim();
      if (
        trimmed &&
        !values.includes(trimmed) &&
        values.length < maxValues &&
        !disabled
      ) {
        onChange([...values, trimmed]);
        return true;
      }
      return false;
    },
    [values, onChange, maxValues, disabled],
  );

  const removeValue = useCallback(
    (valueToRemove: string) => {
      if (!disabled) {
        onChange(values.filter((v) => v !== valueToRemove));
      }
    },
    [values, onChange, disabled],
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (addValue(inputValue)) {
          setInputValue('');
        }
      } else if (
        e.key === 'Backspace' &&
        inputValue === '' &&
        values.length > 0
      ) {
        // Remove last value on backspace when input is empty
        const lastValue = values[values.length - 1];
        if (lastValue) removeValue(lastValue);
      }
    },
    [inputValue, addValue, values, removeValue],
  );

  const handleAddClick = useCallback(() => {
    if (addValue(inputValue)) {
      setInputValue('');
    }
  }, [inputValue, addValue]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      addValue(suggestion);
    },
    [addValue],
  );

  // Filter out suggestions that are already in values
  const availableSuggestions = suggestions.filter((s) => !values.includes(s));

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
          <span className="text-xs text-muted-foreground">
            {values.length}/{maxValues}
          </span>
        </div>
      )}

      {/* Current values as chips */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge
              key={value}
              variant="purple"
              className={cn(
                'pl-3 pr-1.5 py-1.5 gap-1',
                disabled && 'opacity-50',
              )}
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                disabled={disabled}
                className={cn(
                  'ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors',
                  disabled && 'cursor-not-allowed',
                )}
                aria-label={`Remove ${value}`}
              >
                <Cross2Icon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input field */}
      {canAdd && (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || !canAdd}
            className="flex-1"
            aria-label="Add new value"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddClick}
            disabled={disabled || !inputValue.trim()}
            aria-label="Add value"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Remaining slots indicator */}
      {!canAdd && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxValues} values reached
        </p>
      )}

      {/* AI suggestions */}
      {canAdd && availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Suggestions</span>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions
              .slice(0, remainingSlots + 2)
              .map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={disabled || !canAdd}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs transition-all',
                    'hover:border-primary/50 hover:bg-muted/50 hover:text-foreground',
                    'text-muted-foreground',
                    (disabled || !canAdd) && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <PlusIcon className="h-3 w-3" />
                  {suggestion}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
});
