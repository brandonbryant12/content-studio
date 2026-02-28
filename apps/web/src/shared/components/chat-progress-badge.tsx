import { Badge } from '@repo/ui/components/badge';

interface ChatProgressBadgeProps {
  current: number;
  total: number;
}

export function ChatProgressBadge({ current, total }: ChatProgressBadgeProps) {
  if (current < 1) return null;

  return (
    <Badge variant="default" className="font-normal tabular-nums">
      Question {current} of {total}
    </Badge>
  );
}
