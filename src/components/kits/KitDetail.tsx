/**
 * KitDetail Component
 * Displays detailed information about a kit
 * 
 * @module components/kits/KitDetail
 */

import { useState } from 'react';
import { Badge, Button, Group, Modal, Paper, Stack, Text, Title, Skeleton } from '@mantine/core';
import { IconCalendar, IconEdit } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useKit } from '../../hooks/useKits';
import { BookingForm } from '../bookings/BookingForm';

/**
 * Kit detail view component
 */
export function KitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: kit, isLoading, error } = useKit(id || '');
  const [bookingModalOpened, setBookingModalOpened] = useState(false);

  if (isLoading) {
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

  if (error) return <Text c="red">Fehler: {error instanceof Error ? error.message : 'Unbekannter Fehler'}</Text>;
  if (!kit) return <Text c="red">Kit nicht gefunden</Text>;

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>{kit.name}</Title>
          {kit.description && <Text c="dimmed">{kit.description}</Text>}
        </div>
        <Group>
          <Button
            leftSection={<IconCalendar size={16} />}
            onClick={() => setBookingModalOpened(true)}
            color="green"
          >
            Kit buchen
          </Button>
          <Button leftSection={<IconEdit size={16} />} onClick={() => navigate(`/kits/${kit.id}/edit`)}>
            Bearbeiten
          </Button>
        </Group>
      </Group>

      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Group>
            <Text fw={500}>Typ:</Text>
            <Badge color={kit.type === 'fixed' ? 'blue' : 'green'}>
              {kit.type === 'fixed' ? 'Fest' : 'Flexibel'}
            </Badge>
          </Group>

          {kit.type === 'fixed' && kit.boundAssets && (
            <div>
              <Text fw={500}>Gebundene Assets ({kit.boundAssets.length}):</Text>
              {kit.boundAssets.map((asset) => (
                <Text key={asset.assetId} size="sm">• {asset.name} ({asset.assetNumber})</Text>
              ))}
            </div>
          )}

          {kit.type === 'flexible' && kit.poolRequirements && (
            <div>
              <Text fw={500}>Pool-Anforderungen:</Text>
              {kit.poolRequirements.map((pool, idx) => (
                <Text key={idx} size="sm">
                  • {pool.quantity}x {pool.assetTypeName}
                </Text>
              ))}
            </div>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={bookingModalOpened}
        onClose={() => setBookingModalOpened(false)}
        title={`Kit buchen: ${kit.name}`}
        size="lg"
      >
        <BookingForm
          kitId={kit.id}
          onSuccess={() => {
            setBookingModalOpened(false);
            // Return to the previous page instead of forcing a specific route
            if (window.history.length > 1) {
              window.history.back();
            }
          }}
          onCancel={() => setBookingModalOpened(false)}
        />
      </Modal>
    </Stack>
  );
}
