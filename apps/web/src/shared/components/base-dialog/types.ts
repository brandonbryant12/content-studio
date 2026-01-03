import type { ReactNode } from 'react';

export type DialogMaxWidth = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogFooterConfig {
  cancelText?: string;
  submitText: string;
  loadingText: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  isLoading: boolean;
}

export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  maxWidth?: DialogMaxWidth;
  scrollable?: boolean;
  children: ReactNode;
  footer?: DialogFooterConfig;
}
