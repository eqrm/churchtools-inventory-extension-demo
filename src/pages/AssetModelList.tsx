/**
 * Asset Model List Page
 * 
 * Displays all asset model templates with create/edit/delete actions.
 */

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconEdit, IconPlus, IconTemplate, IconTrash, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useAssetModels } from '../hooks/useAssetModels';
import { useCategories } from '../hooks/useCategories';
import { useAssets } from '../hooks/useAssets';
import type { Asset, AssetType } from '../types/entities';
import type { AssetModel } from '../types/model';
import { AssetModelForm } from '../components/models/AssetModelForm';

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
  const { data: rawAssetTypes = [], isLoading: isAssetTypesLoading } = useCategories();
  const { data: assets = [], isLoading: isAssetsLoading } = useAssets();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AssetModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<AssetModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string | null>(null);

  const assetTypes: AssetType[] = useMemo(
    () => rawAssetTypes.filter((type) => !type.name.toLowerCase().includes('kit')),
    [rawAssetTypes],
  );

  const assetTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    assetTypes.forEach((type) => {
      map.set(type.id, type.name);
    });
    return map;
  }, [assetTypes]);

  const assetCountByModel = useMemo(() => {
    const counts = new Map<string, number>();
    (assets ?? []).forEach((asset: Asset) => {
      if (!asset.modelId) return;
      counts.set(asset.modelId, (counts.get(asset.modelId) ?? 0) + 1);
    });
    return counts;
  }, [assets]);

  const hasActiveFilters = Boolean(searchQuery || manufacturerFilter || assetTypeFilter);

  const filteredModels = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const normalizedManufacturer = manufacturerFilter.trim().toLowerCase();

    return models.filter((model) => {
      if (assetTypeFilter && model.assetTypeId !== assetTypeFilter) {
        return false;
      }
      if (normalizedManufacturer && !(model.manufacturer ?? '').toLowerCase().includes(normalizedManufacturer)) {
        return false;
      }
      if (normalizedSearch) {
        const haystack = `${model.name} ${model.modelNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    });
  }, [assetTypeFilter, manufacturerFilter, models, searchQuery]);

  const assetTypeOptions = useMemo(
    () => assetTypes.map((type) => ({ value: type.id, label: type.name })),
    [assetTypes],
  );

  const isBusy = isLoading || isAssetTypesLoading || isAssetsLoading;

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

  const handleClearFilters = () => {
    setSearchQuery('');
    setManufacturerFilter('');
    setAssetTypeFilter(null);
  };

  if (error) {
    return (
      <Container>
        <Alert color="red" title={t('common:error')}>
          {String(error)}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <LoadingOverlay visible={isBusy} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('models:title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
            disabled={assetTypeOptions.length === 0}
          >
            {t('models:createModel')}
          </Button>
        </Group>

        <Card withBorder>
          <Stack gap="sm">
            <Group align="flex-end" gap="md" wrap="wrap">
              <TextInput
                label={t('models:filters.searchLabel')}
                placeholder={t('models:filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                style={{ flex: 1, minWidth: 220 }}
              />

              <TextInput
                label={t('models:filters.manufacturerLabel')}
                placeholder={t('models:filters.manufacturerPlaceholder')}
                value={manufacturerFilter}
                onChange={(event) => setManufacturerFilter(event.currentTarget.value)}
                style={{ flex: 1, minWidth: 200 }}
              />

              <Select
                label={t('models:filters.assetTypeLabel')}
                placeholder={t('models:filters.assetTypePlaceholder')}
                data={assetTypeOptions}
                value={assetTypeFilter}
                onChange={setAssetTypeFilter}
                clearable
                searchable
                style={{ flex: 1, minWidth: 200 }}
                nothingFoundMessage={t('models:filters.noAssetTypes')}
              />

              {hasActiveFilters && (
                <Button
                  variant="subtle"
                  leftSection={<IconX size={16} />}
                  onClick={handleClearFilters}
                >
                  {t('models:filters.clear')}
                </Button>
              )}
            </Group>
          </Stack>
        </Card>

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
        ) : filteredModels.length === 0 ? (
          <Card withBorder>
            <Stack gap="xs" align="center" py="xl">
              <IconTemplate size={36} stroke={1.2} opacity={0.4} />
              <Text fw={600}>{t('models:emptyState.filteredTitle')}</Text>
              <Text c="dimmed" ta="center">
                {t('models:emptyState.filteredDescription')}
              </Text>
              <Button variant="light" onClick={handleClearFilters} leftSection={<IconX size={16} />}>
                {t('models:emptyState.filteredAction')}
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
            {filteredModels.map((model) => (
              <AssetModelCard
                key={model.id}
                model={model}
                assetTypeName={assetTypeMap.get(model.assetTypeId) ?? t('models:labels.unknownAssetType')}
                assetCount={assetCountByModel.get(model.id) ?? 0}
                onEdit={() => setEditingModel(model)}
                onDelete={() => setDeletingModel(model)}
              />
            ))}
          </SimpleGrid>
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
          assetTypes={assetTypes.map((type) => ({ id: type.id, name: type.name }))}
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
            assetTypes={assetTypes.map((type) => ({ id: type.id, name: type.name }))}
            onSubmit={handleUpdate}
            onCancel={() => setEditingModel(null)}
            isLoading={isUpdating}
            affectedAssetsCount={assetCountByModel.get(editingModel.id) ?? 0}
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

interface AssetModelCardProps {
  model: AssetModel;
  assetTypeName: string;
  assetCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function AssetModelCard({ model, assetTypeName, assetCount, onEdit, onDelete }: AssetModelCardProps) {
  const { t } = useTranslation('models');
  const manufacturerLabel = model.manufacturer?.trim() || t('models:card.manufacturerFallback');
  const modelNumber = model.modelNumber?.trim();

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={600}>{model.name}</Text>
            <Text size="sm" c="dimmed">
              {manufacturerLabel}
            </Text>
          </Stack>
          <Badge variant="light" size="sm">
            {assetTypeName}
          </Badge>
        </Group>

        {modelNumber && (
          <Text size="sm" c="dimmed">
            {t('models:card.modelNumberLabel', { modelNumber })}
          </Text>
        )}

        <Badge variant="outline" color="blue" radius="sm" size="md">
          {t(assetCount === 1 ? 'models:assetsCount' : 'models:assetsCount_plural', {
            count: assetCount,
          })}
        </Badge>

        <Group justify="flex-end" gap="xs">
          <ActionIcon variant="subtle" color="blue" onClick={onEdit} aria-label={t('common:edit')}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete} aria-label={t('common:delete')}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
}
