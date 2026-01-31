// features/brands/components/quick-replies.tsx
// Quick reply suggestion buttons

import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Quick reply buttons for common responses.
 * Displayed above the chat input when contextually relevant.
 */
export function QuickReplies({
  suggestions,
  onSelect,
  disabled = false,
  className,
}: QuickRepliesProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="text-xs h-7 px-3 rounded-full hover:bg-primary/10 hover:border-primary/50"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
