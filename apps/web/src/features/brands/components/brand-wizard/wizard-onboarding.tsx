// features/brands/components/brand-wizard/wizard-onboarding.tsx
// First-time user onboarding tooltip for the brand wizard

import { Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { memo, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'brand-wizard-onboarding-dismissed';

interface WizardOnboardingProps {
  className?: string;
}

/**
 * First-time user onboarding tooltip.
 * Shows a helpful intro message on first visit, dismissible and remembered.
 */
export const WizardOnboarding = memo(function WizardOnboarding({
  className,
}: WizardOnboardingProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  }, []);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4',
        className,
      )}
      role="alert"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <Cross2Icon className="h-4 w-4" />
      </Button>

      <div className="pr-8">
        <h3 className="font-semibold text-sm text-primary mb-1">
          Welcome to the Brand Builder! 🎨
        </h3>
        <p className="text-sm text-muted-foreground">
          Build your brand step by step. Each section has an{' '}
          <span className="font-medium text-foreground">AI Assistant</span> on
          the right to help you brainstorm ideas. Use the quick actions or ask
          anything!
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
            ⌘+Enter
          </kbd>{' '}
          to go to the next step
        </p>
      </div>
    </div>
  );
});
