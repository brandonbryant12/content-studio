import { describe, expect, it, vi } from 'vitest';
import type { UseBulkSelectionReturn } from '@/shared/hooks';
import { PersonaList } from '../components/persona-list';
import { render, screen } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'https://api.example.com',
    PUBLIC_AUTH_MODE: 'dev-password',
  },
  isPasswordAuthEnabled: true,
}));

const selectionStub: UseBulkSelectionReturn = {
  selectedIds: new Set(),
  selectedCount: 0,
  isSelected: vi.fn(() => false),
  toggle: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  isAllSelected: vi.fn(() => false),
  isIndeterminate: vi.fn(() => false),
};

describe('PersonaList', () => {
  it('explains persona use cases on the list page', () => {
    render(
      <PersonaList
        personas={[]}
        searchQuery=""
        isCreating={false}
        onSearch={vi.fn()}
        onCreate={vi.fn()}
        selection={selectionStub}
        isBulkDeleting={false}
        onBulkDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/reusable podcast host profiles/i),
    ).toBeInTheDocument();
    expect(screen.getByText('What personas do')).toBeInTheDocument();
    expect(screen.getByText('Recurring show host')).toBeInTheDocument();
    expect(screen.getByText('Client-specific voice')).toBeInTheDocument();
    expect(screen.getByText('Audience-tailored expert')).toBeInTheDocument();
  });
});
