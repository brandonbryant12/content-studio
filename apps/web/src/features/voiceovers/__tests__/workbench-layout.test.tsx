import { describe, it, expect, vi } from 'vitest';
import type { RouterOutput } from '@repo/api/client';
import type { AnchorHTMLAttributes } from 'react';
import { WorkbenchLayout } from '../components/workbench/workbench-layout';
import { VoiceoverStatus } from '../lib/status';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...rest}>{children}</a>
  ),
}));

type Voiceover = RouterOutput['voiceovers']['get'];

function createMockVoiceover(overrides: Partial<Voiceover> = {}): Voiceover {
  return {
    id: 'voiceover-1',
    title: 'Test Voiceover',
    text: 'Voiceover text',
    voice: 'Charon',
    voiceName: 'Charon',
    status: VoiceoverStatus.DRAFTING,
    audioUrl: null,
    duration: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    approvedBy: null,
    approvedAt: null,
    ...overrides,
  } as Voiceover;
}

function createProps() {
  return {
    voiceover: createMockVoiceover(),
    title: 'Test Voiceover',
    onTitleChange: vi.fn(),
    hasTitleChanges: false,
    isTitleDisabled: false,
    onDelete: vi.fn(),
    isDeleting: false,
    isApproved: false,
    isAdmin: false,
    onApprove: vi.fn(),
    onRevoke: vi.fn(),
    isApprovalPending: false,
    children: <div>Workbench Content</div>,
  };
}

describe('WorkbenchLayout', () => {
  it('renders inline title input with current value', () => {
    render(<WorkbenchLayout {...createProps()} />);

    const titleInput = screen.getByRole('textbox', { name: /voiceover title/i });
    expect(titleInput).toHaveValue('Test Voiceover');
  });

  it('calls onTitleChange when title is edited', () => {
    const onTitleChange = vi.fn();
    render(<WorkbenchLayout {...createProps()} onTitleChange={onTitleChange} />);

    const titleInput = screen.getByRole('textbox', { name: /voiceover title/i });
    fireEvent.change(titleInput, { target: { value: 'Renamed Voiceover' } });

    expect(onTitleChange).toHaveBeenCalledWith('Renamed Voiceover');
  });

  it('shows unsaved title indicator when title changed', () => {
    render(<WorkbenchLayout {...createProps()} hasTitleChanges />);

    expect(screen.getByTestId('pencil-indicator')).toBeInTheDocument();
  });

  it('disables title input while generation is active', () => {
    render(<WorkbenchLayout {...createProps()} isTitleDisabled />);

    const titleInput = screen.getByRole('textbox', { name: /voiceover title/i });
    expect(titleInput).toBeDisabled();
  });
});
