import { useState } from 'react';
import { Container, Modal, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { AssetGroup } from '../types/entities';
import { AssetGroupList } from '../components/asset-groups/AssetGroupList';
import { AssetGroupForm } from '../components/asset-groups/AssetGroupForm';

export function AssetGroupsPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AssetGroup | undefined>();

  const openCreateForm = () => {
    setEditingGroup(undefined);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingGroup(undefined);
  };

  const handleFormSuccess = (group: AssetGroup) => {
    closeForm();
    navigate(`/asset-groups/${group.id}`);
  };

  return (
    <Container size="xl">
      <Stack gap="md">
        <AssetGroupList
          onSelectGroup={(group) => navigate(`/asset-groups/${group.id}`)}
          onCreateGroup={openCreateForm}
        />

        <Modal
          opened={formOpen}
          onClose={closeForm}
          title={editingGroup ? 'Edit Asset Model' : 'Create Asset Model'}
          size="lg"
        >
          <AssetGroupForm
            group={editingGroup}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        </Modal>
      </Stack>
    </Container>
  );
}
