import { useEffect } from 'react';
import { TextInput, Switch, Stack, Button, Group, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import type { SavedViewCreate, ViewMode, ViewFilterGroup } from '../../types/entities';
import { useCreateSavedView, useUpdateSavedView, useSavedView } from '../../hooks/useSavedViews';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { SAVED_VIEW_SCHEMA_VERSION } from '../../constants/schemaVersions';

interface SavedViewFormProps {
  viewMode: ViewMode;
  filters: ViewFilterGroup;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  groupBy?: string;
  visibleColumns?: string[];
  existingViewId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form for saving current view configuration as a named view
 */
export function SavedViewForm({
  viewMode,
  filters,
  sortBy,
  sortDirection,
  groupBy,
  visibleColumns,
  existingViewId,
  onSuccess,
  onCancel,
}: SavedViewFormProps) {
  const { t } = useTranslation('views');
  const { data: currentUser } = useCurrentUser();
  const createMutation = useCreateSavedView();
  const updateMutation = useUpdateSavedView();
  const {
    data: existingView,
    isLoading: isExistingViewLoading,
    error: existingViewError,
  } = useSavedView(existingViewId);
  const isEditing = Boolean(existingViewId);

  const form = useForm({
    initialValues: {
      name: '',
      isPublic: false,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
    },
  });

  useEffect(() => {
    if (existingView) {
      form.setValues({
        name: existingView.name,
        isPublic: existingView.isPublic ?? false,
      });
    } else if (!existingViewId) {
      form.setValues({ name: '', isPublic: false });
    }
    // intentionally depend on existingViewId to reset form when switching between edit/create modes
  }, [existingView, existingViewId, form]);

  const handleSubmit = async (values: { name: string; isPublic: boolean }) => {
    if (!currentUser || isExistingViewLoading) return;
    const schemaVersion = existingView?.schemaVersion ?? SAVED_VIEW_SCHEMA_VERSION;

    const viewData: SavedViewCreate = {
      schemaVersion,
      name: values.name,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isPublic: values.isPublic,
      viewMode,
      filters,
      sortBy,
      sortDirection,
      groupBy,
      visibleColumns,
    };

    try {
      if (existingViewId) {
        await updateMutation.mutateAsync({ id: existingViewId, updates: viewData });
      } else {
        await createMutation.mutateAsync(viewData);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save view:', error);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {existingViewError && (
          <Alert color="red" title={t('form.errorTitle')}>
            {existingViewError instanceof Error
              ? existingViewError.message
              : t('form.errorFallback')}
          </Alert>
        )}

        <TextInput
          label={t('form.nameLabel')}
          placeholder={t('form.namePlaceholder')}
          required
          disabled={isExistingViewLoading}
          {...form.getInputProps('name')}
        />

        <Switch
          label={t('form.publicLabel')}
          description={t('form.publicDescription')}
          disabled={isExistingViewLoading}
          {...form.getInputProps('isPublic', { type: 'checkbox' })}
        />

        <Group justify="flex-end" gap="sm">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={isExistingViewLoading}>
              {t('form.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            loading={
              createMutation.isPending ||
              updateMutation.isPending ||
              (isEditing && isExistingViewLoading)
            }
            disabled={isExistingViewLoading}
          >
            {existingViewId ? t('form.update') : t('form.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
