/**
 * Asset Model List Page
 * 
 * Displays all asset model templates with create/edit/delete actions.
 */

import { useState } from 'react';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  Text,
  ActionIcon,
  Modal,
  Stack,
  Badge,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconTemplate, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAssetModels, useAssetsFromModel } from '../hooks/useAssetModels';
import { AssetModelForm } from '../components/models/AssetModelForm';
import { notifications } from '@mantine/notifications';
import type { AssetModel } from '../types/model';

export function AssetModelList() {
  const { t } = useTranslation(['models', 'common']);
  const {
    models,
    isLoading,
    error,
    createModel,
    updateModel,
    deleteModel,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAssetModels();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AssetModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<AssetModel | null>(null);

  // Get assets count for the editing model
  const { data: modelAssets = [] } = useAssetsFromModel(editingModel?.id || null);

  // Mock asset types - in real app, fetch from API
  const assetTypes = [
    { id: '1', name: 'Laptop' },
    { id: '2', name: 'Camera' },
    { id: '3', name: 'Projector' },
  ];

  const handleCreate = async (data: Partial<AssetModel>) => {
    try {
      await createModel({
        ...data,
        tagIds: [],
        createdBy: 'current-user-id', // Get from auth context
      } as AssetModel);
      notifications.show({
        title: t('models:notifications.created'),
        message: '',
        color: 'green',
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      notifications.show({
        title: t('models:notifications.createError'),
        message: String(err),
        color: 'red',
      });
    }
  };

  const handleUpdate = async (data: Partial<AssetModel>) => {
    if (!editingModel) return;

    try {
      await updateModel(editingModel.id, data);
      notifications.show({
        title: t('models:notifications.updated'),
        message: '',
        color: 'green',
      });
      setEditingModel(null);
    } catch (err) {
      notifications.show({
        title: t('models:notifications.updateError'),
        message: String(err),
        color: 'red',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingModel) return;

    try {
      await deleteModel(deletingModel.id);
      notifications.show({
        title: t('models:notifications.deleted'),
        message: '',
        color: 'green',
      });
      setDeletingModel(null);
    } catch (err) {
      notifications.show({
        title: t('models:notifications.deleteError'),
        message: String(err),
        color: 'red',
      });
    }
  };

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle />} color="red" title={t('common:error')}>
          {String(error)}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <LoadingOverlay visible={isLoading} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('models:title')}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
            {t('models:createModel')}
          </Button>
        </Group>

        {models.length === 0 ? (
          <Stack align="center" gap="md" py="xl">
            <IconTemplate size={48} stroke={1.5} opacity={0.3} />
            <Title order={3} c="dimmed">
              {t('models:emptyState.title')}
            </Title>
            <Text c="dimmed">{t('models:emptyState.description')}</Text>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              {t('models:emptyState.action')}
            </Button>
          </Stack>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('models:form.name')}</Table.Th>
                <Table.Th>{t('models:form.manufacturer')}</Table.Th>
                <Table.Th>{t('models:form.modelNumber')}</Table.Th>
                <Table.Th>{t('models:form.assetType')}</Table.Th>
                <Table.Th>{t('models:assetsCount', { count: 0 })}</Table.Th>
                <Table.Th>{t('common:actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {models.map((model) => (
                <Table.Tr key={model.id}>
                  <Table.Td>
                    <Text fw={500}>{model.name}</Text>
                  </Table.Td>
                  <Table.Td>{model.manufacturer || '-'}</Table.Td>
                  <Table.Td>{model.modelNumber || '-'}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">
                      {assetTypes.find((t) => t.id === model.assetTypeId)?.name || model.assetTypeId}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      0 {/* TODO: Get asset count */}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => setEditingModel(model)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => setDeletingModel(model)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('models:createModel')}
        size="lg"
      >
        <AssetModelForm
          assetTypes={assetTypes}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isCreating}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={!!editingModel}
        onClose={() => setEditingModel(null)}
        title={t('models:editModel')}
        size="lg"
      >
        {editingModel && (
          <AssetModelForm
            model={editingModel}
            assetTypes={assetTypes}
            onSubmit={handleUpdate}
            onCancel={() => setEditingModel(null)}
            isLoading={isUpdating}
            affectedAssetsCount={modelAssets.length}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!deletingModel}
        onClose={() => setDeletingModel(null)}
        title={t('models:confirmDelete.title')}
      >
        <Stack gap="md">
          <Text>{t('models:confirmDelete.message')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeletingModel(null)} disabled={isDeleting}>
              {t('models:confirmDelete.cancel')}
            </Button>
            <Button color="red" onClick={handleDelete} loading={isDeleting}>
              {t('models:confirmDelete.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
