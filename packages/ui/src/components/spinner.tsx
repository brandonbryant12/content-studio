import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '#/lib/utils';

const spinnerVariants = cva(
  'inline-flex items-end justify-center gap-[1.5px]',
  {
    variants: {
      size: {
        sm: 'w-4 h-4',
        default: 'w-5 h-5',
        lg: 'w-6 h-6',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <span
        className="inline-block w-[12%] rounded-full bg-current animate-[spinner-bar_0.8s_ease-in-out_infinite]"
        style={{ height: '40%', animationDelay: '0ms' }}
      />
      <span
        className="inline-block w-[12%] rounded-full bg-current animate-[spinner-bar_0.8s_ease-in-out_infinite]"
        style={{ height: '70%', animationDelay: '150ms' }}
      />
      <span
        className="inline-block w-[12%] rounded-full bg-current animate-[spinner-bar_0.8s_ease-in-out_infinite]"
        style={{ height: '100%', animationDelay: '300ms' }}
      />
      <span
        className="inline-block w-[12%] rounded-full bg-current animate-[spinner-bar_0.8s_ease-in-out_infinite]"
        style={{ height: '55%', animationDelay: '450ms' }}
      />
    </div>
  );
}

export { Spinner, spinnerVariants };
