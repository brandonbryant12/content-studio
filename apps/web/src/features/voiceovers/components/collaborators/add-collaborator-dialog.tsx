// features/voiceovers/components/collaborators/add-collaborator-dialog.tsx

import {
  ExclamationTriangleIcon,
  PersonIcon,
  EnvelopeClosedIcon,
} from '@radix-ui/react-icons';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { useState } from 'react';
import { useAddCollaborator } from '../../hooks/use-add-collaborator';
import { BaseDialog } from '@/shared/components/base-dialog';

interface AddCollaboratorDialogProps {
  voiceoverId: string;
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddCollaboratorDialog({
  voiceoverId,
  isOpen,
  onClose,
}: AddCollaboratorDialogProps) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const { mutate, isPending } = useAddCollaborator(voiceoverId);

  const isValidEmail = EMAIL_PATTERN.test(email.trim());
  const showError = touched && email.length > 0 && !isValidEmail;
  const inputClass = showError
    ? 'mt-1.5 border-destructive focus-visible:ring-destructive/20'
    : 'mt-1.5';

  const handleSubmit = () => {
    if (!isValidEmail) return;

    mutate(
      { id: voiceoverId, email: email.trim() },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      },
    );
  };

  const resetForm = () => {
    setEmail('');
    setTouched(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  return (
    <BaseDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Add Collaborator"
      description="Invite someone to collaborate on this voiceover."
      maxWidth="md"
      footer={{
        submitText: 'Send Invite',
        loadingText: 'Sending...',
        submitDisabled: !isValidEmail,
        onSubmit: handleSubmit,
        isLoading: isPending,
      }}
    >
      <div className="space-y-5">
        {/* Warning banner about document visibility */}
        <div className="collab-invite-warning">
          <div className="collab-invite-warning-icon">
            <ExclamationTriangleIcon className="w-5 h-5" />
          </div>
          <div className="collab-invite-warning-content">
            <p className="collab-invite-warning-title">Document Access</p>
            <p className="collab-invite-warning-text">
              Collaborators will be able to view all source documents attached
              to this voiceover.
            </p>
          </div>
        </div>

        {/* Email input */}
        <div className="space-y-2">
          <Label
            htmlFor="collaborator-email"
            className="flex items-center gap-2"
          >
            <EnvelopeClosedIcon className="w-3.5 h-3.5 text-muted-foreground" />
            Email Address
          </Label>
          <Input
            id="collaborator-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="colleague@example.com"
            className={inputClass}
            autoComplete="email"
            autoFocus
          />
          {showError && (
            <p className="text-xs text-destructive mt-1">
              Please enter a valid email address
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">
            <PersonIcon className="w-3 h-3 inline-block mr-1 -mt-0.5" />
            They&apos;ll get instant access if they have an account, or receive
            access when they sign up.
          </p>
        </div>
      </div>
    </BaseDialog>
  );
}
