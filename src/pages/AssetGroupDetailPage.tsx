import { useState } from 'react';
import { Button, Container, Group, Modal, Stack, Title } from '@mantine/core';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AssetGroup } from '../types/entities';
import { AssetGroupDetail } from '../components/asset-groups/AssetGroupDetail';
import { AssetGroupForm } from '../components/asset-groups/AssetGroupForm';
import { useAssetGroup } from '../hooks/useAssetGroups';

export function AssetGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingGroup, setEditingGroup] = useState<AssetGroup | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: group } = useAssetGroup(id ?? undefined);

  const handleBack = () => {
    navigate('/asset-groups');
  };

  const handleEdit = (nextGroup: AssetGroup) => {
    setEditingGroup(nextGroup);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGroup(undefined);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
  };

  if (!id) {
    return (
      <Container size="xl">
        <Title order={1}>Asset model not found</Title>
        <Button onClick={handleBack} mt="md">
          Back to Asset Models
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
            Back to Asset Models
          </Button>
        </Group>

        <AssetGroupDetail
          groupId={id}
          onEditGroup={handleEdit}
          onGroupCleared={handleBack}
        />

        {group && (
          <Modal
            opened={isFormOpen}
            onClose={handleCloseForm}
            title={
              <Group gap="xs">
                <IconEdit size={20} />
                <span>Edit Asset Model</span>
              </Group>
            }
            size="lg"
          >
            <AssetGroupForm
              group={editingGroup ?? group}
              onSuccess={handleSuccess}
              onCancel={handleCloseForm}
            />
          </Modal>
        )}
      </Stack>
    </Container>
  );
}
