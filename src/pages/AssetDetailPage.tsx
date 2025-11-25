 
import { useState } from 'react';
import { Button, Container, Group, Modal, Stack, Title, Grid } from '@mantine/core';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssetDetail } from '../components/assets/AssetDetail';
import { AssetForm } from '../components/assets/AssetForm';
import { useAsset } from '../hooks/useAssets';
import { AssetBookingIndicator } from '../components/assets/AssetBookingIndicator';
import { BookAssetModal } from '../components/bookings/BookAssetModal';
import { useFeatureSettingsStore } from '../stores';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [bookModalOpened, setBookModalOpened] = useState(false);
  const { data: asset } = useAsset(id || '');
  const bookingsEnabled = useFeatureSettingsStore((state) => state.bookingsEnabled);

  const handleEdit = () => {
    setIsFormOpen(true);
  };

  const handleBack = () => {
    navigate('/assets');
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
  };

  if (!id) {
    return (
      <Container size="xl">
        <Title order={1}>Asset not found</Title>
        <Button onClick={handleBack} mt="md">
          Back to Assets
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleBack}
          >
            Back to Assets
          </Button>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <AssetDetail assetId={id} onEdit={handleEdit} />
          </Grid.Col>
          {bookingsEnabled && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              {asset && (
                <AssetBookingIndicator
                  assetId={id}
                  onBookAsset={() => setBookModalOpened(true)}
                />
              )}
            </Grid.Col>
          )}
        </Grid>

        {asset && (
          <>
            <Modal
              opened={isFormOpen}
              onClose={handleCancel}
              title={
                <Group gap="xs">
                  <IconEdit size={20} />
                  <span>Edit Asset</span>
                </Group>
              }
              size="lg"
            >
              <AssetForm
                asset={asset}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </Modal>

            {bookingsEnabled && (
              <BookAssetModal
                opened={bookModalOpened}
                onClose={() => setBookModalOpened(false)}
                asset={asset}
              />
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
