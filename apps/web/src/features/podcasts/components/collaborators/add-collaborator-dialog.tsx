import { useAddCollaborator } from '../../hooks/use-add-collaborator';
import { AddCollaboratorDialog as SharedDialog } from '@/shared/components/collaborators';

interface AddCollaboratorDialogProps {
  podcastId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddCollaboratorDialog({
  podcastId,
  isOpen,
  onClose,
}: AddCollaboratorDialogProps) {
  const { mutate, isPending } = useAddCollaborator(podcastId);

  return (
    <SharedDialog
      entityId={podcastId}
      entityLabel="podcast"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(params, options) => mutate(params, options)}
      isPending={isPending}
    />
  );
}
