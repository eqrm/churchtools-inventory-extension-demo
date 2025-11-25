import { useState } from 'react';
import { Container, Modal, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { EnhancedAssetList } from '../components/assets/EnhancedAssetList';
import { AssetForm } from '../components/assets/AssetForm';
import { KitForm } from '../components/kits/KitForm';
import type { Asset } from '../types/entities';
import { getAssetDetailPath } from '../utils/assetNavigation';

export function AssetsPage() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);

  const handleView = (asset: Asset) => {
    navigate(getAssetDetailPath(asset));
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingAsset(undefined);
    setIsFormOpen(true);
  };

  const handleCreateKit = () => {
    setIsKitModalOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingAsset(undefined);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingAsset(undefined);
  };

  return (
    <Container size="xl">
      <Stack gap="md">
        <EnhancedAssetList
          onView={handleView}
          onEdit={handleEdit}
          onCreateNew={handleCreateNew}
          onCreateKit={handleCreateKit}
        />

        <Modal
          opened={isFormOpen}
          onClose={handleCancel}
          title={editingAsset ? 'Edit Asset' : 'Create New Asset'}
          size="lg"
        >
          <AssetForm
            asset={editingAsset}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Modal>

        <Modal
          opened={isKitModalOpen}
          onClose={() => setIsKitModalOpen(false)}
          title="Create New Kit"
          size="lg"
        >
          <KitForm
            onSuccess={() => setIsKitModalOpen(false)}
            onCancel={() => setIsKitModalOpen(false)}
          />
        </Modal>
      </Stack>
    </Container>
  );
}
