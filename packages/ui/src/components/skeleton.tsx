import * as React from 'react';

import { cn } from '#/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}

function SkeletonText({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton skeleton-text', className)} {...props} />;
}

function SkeletonCircle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('skeleton skeleton-circle', className)} {...props} />
  );
}

export { Skeleton, SkeletonCircle, SkeletonText };
