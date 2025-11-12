import { Button, Group, Stack, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
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
  const form = useForm<DamageReportFormData>({
    initialValues: {
      description: '',
      photos: [],
    },
    validate: {
      description: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Please describe the damage';
        }
        if (value.length < 10) {
          return 'Description must be at least 10 characters';
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
          label="Damage Description"
          placeholder="Describe the damage in detail..."
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
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            Report Damage
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
