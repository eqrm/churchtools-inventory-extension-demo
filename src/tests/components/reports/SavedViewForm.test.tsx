import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, beforeEach, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { SavedViewForm } from '../../../components/reports/SavedViewForm';
import { createFilterCondition, createFilterGroup } from '../../../utils/viewFilters';
import type { SavedView, SavedViewCreate } from '../../../types/entities';
import { SAVED_VIEW_SCHEMA_VERSION } from '../../../constants/schemaVersions';

const translationMap: Record<string, string> = {
  'form.nameLabel': 'View name',
  'form.namePlaceholder': 'e.g., Available audio gear',
  'form.nameRequired': 'Name is required',
  'form.nameTooLong': 'Name must be 100 characters or fewer',
  'form.publicLabel': 'Public view',
  'form.publicDescription': 'Other users can see this view',
  'form.errorTitle': 'Unable to load view',
  'form.errorFallback': 'An unexpected error occurred while loading the view.',
  'form.cancel': 'Cancel',
  'form.save': 'Save',
  'form.update': 'Update',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => translationMap[key] ?? fallback ?? key,
  }),
}));

const mockCreateMutation = {
  mutateAsync: vi.fn(async (_view: SavedViewCreate) => undefined),
  isPending: false,
};

const mockUpdateMutation = {
  mutateAsync: vi.fn(async (_payload: { id: string; updates: Partial<SavedView> }) => undefined),
  isPending: false,
};

interface SavedViewHookResult {
  data?: SavedView;
  isLoading: boolean;
  error: unknown;
}

let savedViewResult: SavedViewHookResult = {
  data: undefined,
  isLoading: false,
  error: null,
};

vi.mock('../../../hooks/useSavedViews', () => ({
  useCreateSavedView: () => mockCreateMutation,
  useUpdateSavedView: () => mockUpdateMutation,
  useSavedView: (id?: string) => (id ? savedViewResult : { data: undefined, isLoading: false, error: null }),
}));

vi.mock('../../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'user-1', name: 'Test User' } }),
}));

type SavedViewFormProps = ComponentProps<typeof SavedViewForm>;

const baseFilters = createFilterGroup('AND', [
  createFilterCondition({ field: 'status', operator: 'equals', value: 'available' }),
]);

const quickFilters = createFilterGroup('AND', [
  createFilterCondition({ field: 'location', operator: 'contains', value: 'Main' }),
]);

function renderForm(overrides: Partial<SavedViewFormProps> = {}) {
  const props: SavedViewFormProps = {
    viewMode: 'table',
    filters: baseFilters,
    quickFilters,
    sortBy: 'name',
    sortDirection: 'asc',
    groupBy: 'status',
    visibleColumns: ['name', 'status'],
    ...overrides,
  };

  return render(
    <MantineProvider>
      <SavedViewForm {...props} />
    </MantineProvider>,
  );
}

describe('SavedViewForm', () => {
  beforeEach(() => {
    mockCreateMutation.mutateAsync.mockReset();
    mockUpdateMutation.mutateAsync.mockReset();
    savedViewResult = { data: undefined, isLoading: false, error: null };
  });

  it('submits trimmed names and payload when creating a new view', async () => {
    mockCreateMutation.mutateAsync.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderForm();

    const nameInput = screen.getByLabelText(/view name/i);
    await user.clear(nameInput);
    await user.type(nameInput, '  Available gear  ');
    await user.click(screen.getByRole('switch', { name: /public view/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateMutation.mutateAsync.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      name: 'Available gear',
      isPublic: true,
      viewMode: 'table',
      filters: baseFilters,
      quickFilters,
      sortBy: 'name',
      sortDirection: 'asc',
      groupBy: 'status',
      visibleColumns: ['name', 'status'],
      schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
    });
  });

  it('loads existing views and updates them when submitted', async () => {
    const viewId = 'view-123';
    savedViewResult = {
      data: {
        id: viewId,
        schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
        name: 'Ops overview',
        ownerId: 'user-1',
        ownerName: 'Test User',
        isPublic: true,
        viewMode: 'table',
        filters: baseFilters,
        quickFilters,
        sortBy: 'name',
        sortDirection: 'asc',
        groupBy: 'status',
        visibleColumns: ['name', 'status'],
        createdAt: '2025-01-01T00:00:00.000Z',
        lastModifiedAt: '2025-01-02T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
    };

    mockUpdateMutation.mutateAsync.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderForm({ existingViewId: viewId });

    const nameInput = await screen.findByDisplayValue('Ops overview');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ops overview 2');
    await user.click(screen.getByRole('switch', { name: /public view/i }));
    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });

    const mutationArgs = mockUpdateMutation.mutateAsync.mock.calls[0]?.[0];
    expect(mutationArgs).toMatchObject({
      id: viewId,
      updates: expect.objectContaining({
        name: 'Ops overview 2',
        isPublic: false,
        schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
      }),
    });
  });

  it('shows validation errors for empty names and blocks submission', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/view name/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
