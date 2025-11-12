import { Button, Group, Stack, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { PhotoUpload } from './PhotoUpload';

interface DamageReportFormProps {
  /** Current asset ID */
  assetId: string;
  /** Callback when form is submitted */
  onSubmit: (data: DamageReportFormData) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether form submission is in progress */
  loading?: boolean;
}

export interface DamageReportFormData {
  description: string;
  photos: string[];
}

/**
 * DamageReportForm Component
 * 
 * Form for creating a damage report on an asset.
 * Includes description field and photo upload (max 3 photos).
 * 
 * @example
 * ```tsx
 * <DamageReportForm
 *   assetId={asset.id}
 *   onSubmit={handleCreateDamageReport}
 *   onCancel={closeModal}
 *   loading={isCreating}
 * />
 * ```
 */
export function DamageReportForm({
  assetId: _assetId,
  onSubmit,
  onCancel,
  loading = false,
}: DamageReportFormProps) {
  const { t } = useTranslation(['damage', 'common']);
  const form = useForm<DamageReportFormData>({
    initialValues: {
      description: '',
      photos: [],
    },
    validate: {
      description: (value) => {
        const trimmed = value?.trim() ?? '';
        if (trimmed.length === 0) {
          return t('damage:form.validation.required');
        }
        if (trimmed.length < 10) {
          return t('damage:form.validation.minLength');
        }
        return null;
      },
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Textarea
          label={t('damage:form.descriptionLabel')}
          placeholder={t('damage:form.descriptionPlaceholder')}
          required
          minRows={4}
          maxRows={8}
          {...form.getInputProps('description')}
          disabled={loading}
        />

        <PhotoUpload
          photos={form.values.photos}
          onChange={(photos) => form.setFieldValue('photos', photos)}
          maxPhotos={3}
          disabled={loading}
        />

        <Group justify="flex-end" mt="md">
          {onCancel && (
            <Button variant="subtle" onClick={onCancel} disabled={loading}>
              {t('common:actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            {t('damage:form.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
