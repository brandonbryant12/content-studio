import { useCallback } from 'react';
import { useCreateSvg } from '../hooks/use-svg-actions';
import { useSvgs } from '../hooks/use-svgs';
import { SvgList } from './svg-list';

export function SvgListContainer() {
  const { data: svgs } = useSvgs();
  const createMutation = useCreateSvg();

  const handleCreate = useCallback(() => {
    createMutation.mutate({});
  }, [createMutation]);

  return (
    <SvgList
      svgs={svgs}
      isCreating={createMutation.isPending}
      onCreate={handleCreate}
    />
  );
}
