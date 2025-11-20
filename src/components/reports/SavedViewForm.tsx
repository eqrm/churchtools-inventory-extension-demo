import { useEffect, useState, useCallback } from 'react';
import { TextInput, Switch, Stack, Button, Group, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SavedViewCreate, ViewMode, ViewFilterGroup } from '../../types/entities';
import { useCreateSavedView, useUpdateSavedView, useSavedView } from '../../hooks/useSavedViews';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { SAVED_VIEW_SCHEMA_VERSION } from '../../constants/schemaVersions';
import { hasActiveFilters } from '../../utils/viewFilters';

interface SavedViewFormProps {
  viewMode: ViewMode;
  filters: ViewFilterGroup;
  quickFilters?: ViewFilterGroup;
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
  quickFilters,
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (existingView) {
      setName(existingView.name);
      setIsPublic(existingView.isPublic ?? false);
      setNameError(null);
    } else if (!existingViewId) {
      setName('');
      setIsPublic(false);
      setNameError(null);
    }
    setSubmitError(null);
    // intentionally depend on existingViewId to reset form when switching between edit/create modes
  }, [existingView, existingViewId]);

  const validateName = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('form.nameRequired', 'Name is required'));
      return null;
    }
    if (trimmed.length > 100) {
      setNameError(t('form.nameTooLong', 'Name must be 100 characters or fewer'));
      return null;
    }
    setNameError(null);
    return trimmed;
  }, [name, t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || isExistingViewLoading) return;

    const trimmedName = validateName();
    if (!trimmedName) {
      return;
    }

    setSubmitError(null);

    const schemaVersion = existingView?.schemaVersion ?? SAVED_VIEW_SCHEMA_VERSION;
    const normalizedQuickFilters = quickFilters && hasActiveFilters(quickFilters)
      ? quickFilters
      : undefined;

    const viewData: SavedViewCreate = {
      schemaVersion,
      name: trimmedName,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isPublic,
      viewMode,
      filters,
      quickFilters: normalizedQuickFilters,
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
        setName('');
        setIsPublic(false);
      }
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('form.errorFallback');
      setSubmitError(message);
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    (isEditing && isExistingViewLoading);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        {existingViewError && (
          <Alert color="red" title={t('form.errorTitle')}>
            {existingViewError instanceof Error
              ? existingViewError.message
              : t('form.errorFallback')}
          </Alert>
        )}

        {submitError && (
          <Alert color="red" title={t('form.errorTitle')}>
            {submitError}
          </Alert>
        )}

        <TextInput
          label={t('form.nameLabel')}
          placeholder={t('form.namePlaceholder')}
          required
          disabled={isExistingViewLoading}
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value);
            if (nameError) {
              setNameError(null);
            }
          }}
          onBlur={validateName}
          error={nameError}
        />

        <Switch
          label={t('form.publicLabel')}
          description={t('form.publicDescription')}
          disabled={isExistingViewLoading}
          checked={isPublic}
          onChange={(event) => setIsPublic(event.currentTarget.checked)}
        />

        <Group justify="flex-end" gap="sm">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={isExistingViewLoading}>
              {t('form.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isExistingViewLoading || !currentUser}
          >
            {existingViewId ? t('form.update') : t('form.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
