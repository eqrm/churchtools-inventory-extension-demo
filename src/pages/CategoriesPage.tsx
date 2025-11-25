import { useState } from 'react';
import { Button, Container, Modal } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { AssetTypeList } from '../components/categories/AssetTypeList';
import { AssetTypeForm } from '../components/categories/AssetTypeForm';
import type { AssetType } from '../types/entities';

export function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetType | undefined>();

  const handleEdit = (category: AssetType) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
  };

  return (
    <Container size="xl" py="xl">
      <AssetTypeList
        onEdit={handleEdit}
        headerActions={
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateNew}>
            New asset type
          </Button>
        }
      />

      <Modal
        opened={isFormOpen}
        onClose={handleCancel}
        title={editingCategory ? 'Edit asset type' : 'New asset type'}
        size="lg"
      >
        <AssetTypeForm
          category={editingCategory}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Modal>
    </Container>
  );
}
