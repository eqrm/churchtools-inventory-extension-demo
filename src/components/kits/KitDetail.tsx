/**
 * KitDetail Component
 * Displays detailed information about a kit
 * 
 * @module components/kits/KitDetail
 */

import { Alert, Group, Modal, Paper, Skeleton, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useKit } from '../../hooks/useKits';
import { KitDetailView } from './KitDetailView';
import { BookingForm } from '../bookings/BookingForm';

/**
 * Kit detail view component
 */
export function KitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: kit, isLoading, error } = useKit(id || '');
  const { t } = useTranslation('kits');
  const [bookingOpened, { open: openBooking, close: closeBooking }] = useDisclosure(false);

  if (isLoading) {
    return (
      <KitDetailSkeleton />
    );
  }

  if (error) {
    return (
      <Alert color="red" title={t('detail.error')}>
        {error instanceof Error ? error.message : t('detail.error')}
      </Alert>
    );
  }

  if (!kit) {
    return (
      <Alert color="red" title={t('detail.notFound')}>
        {t('detail.notFound')}
      </Alert>
    );
  }

  return (
    <Stack>
      <KitDetailView
        kit={kit}
        onOpenBooking={openBooking}
        onEdit={() => navigate(`/kits/${kit.id}/edit`)}
      />

      <Modal
        opened={bookingOpened}
        onClose={closeBooking}
        title={t('detail.modal.bookTitle', { name: kit.name })}
        size="lg"
      >
        <BookingForm
          kitId={kit.id}
          onSuccess={() => {
            closeBooking();
            if (window.history.length > 1) {
              window.history.back();
            }
          }}
          onCancel={closeBooking}
        />
      </Modal>
    </Stack>
  );
}

function KitDetailSkeleton() {
  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Skeleton height={32} width={300} mb="sm" />
          <Skeleton height={20} width={400} />
        </div>
        <Group>
          <Skeleton height={36} width={120} />
          <Skeleton height={36} width={120} />
        </Group>
      </Group>
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={24} width={200} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </Stack>
      </Paper>
    </Stack>
  );
}
