import { useAddCollaborator } from '../../hooks/use-add-collaborator';
import { AddCollaboratorDialog as SharedDialog } from '@/shared/components/collaborators';

interface AddCollaboratorDialogProps {
  voiceoverId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddCollaboratorDialog({
  voiceoverId,
  isOpen,
  onClose,
}: AddCollaboratorDialogProps) {
  const { mutate, isPending } = useAddCollaborator(voiceoverId);

  return (
    <SharedDialog
      entityId={voiceoverId}
      entityLabel="voiceover"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(params, options) => mutate(params, options)}
      isPending={isPending}
    />
  );
}
