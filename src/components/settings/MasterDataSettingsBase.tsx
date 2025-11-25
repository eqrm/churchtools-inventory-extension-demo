import { useMemo, useState, type ComponentType } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import {
  IconAlertCircle,
  IconCheck,
  IconDots,
  IconEdit,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useAssets } from '../../hooks/useAssets';
import {
  buildAssetCountLookup,
  canonicalMasterDataName,
  normalizeMasterDataName,
  sortMasterDataItems,
} from '../../utils/masterData';
import type { MasterDataDefinition, MasterDataItem } from '../../utils/masterData';
import { useMasterData } from '../../hooks/useMasterDataNames';
import { serializeFiltersToUrl } from '../../utils/urlFilters';
import { createFilterCondition, createFilterGroup } from '../../utils/viewFilters';

type IconComponent = ComponentType<{ size?: number | string }>;

export interface MasterDataSettingsConfig {
  definition: MasterDataDefinition;
  title: string;
  description: string;
  placeholder: string;
  entityLabel: string;
  emptyStateMessage: string;
  noteMessage: string;
  icon: IconComponent;
  emptyStateIcon?: IconComponent;
  noteIcon?: IconComponent;
  addButtonLabel?: string;
  columnLabel?: string;
}

interface FormValues {
  name: string;
}

const DEFAULT_MAX_LENGTH = 100;

export function MasterDataSettingsBase(config: MasterDataSettingsConfig) {
  const {
    definition,
    title,
    description,
    placeholder,
    entityLabel,
    emptyStateMessage,
    noteMessage,
    icon,
    emptyStateIcon,
    noteIcon,
    addButtonLabel,
    columnLabel,
  } = config;

  const entityLabelLower = entityLabel.toLowerCase();
  const tableColumnLabel = columnLabel ?? entityLabel;
  const IconComponent = icon;
  const EmptyStateIcon = emptyStateIcon ?? icon;
  const NoteIcon = noteIcon ?? IconAlertCircle;
  const addLabel = addButtonLabel ?? `Add ${entityLabel}`;

  const { data: assets = [] } = useAssets();
  const { items, isLoading, addItem, updateItem, deleteItem } = useMasterData(definition);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const sortedItems = useMemo(() => sortMasterDataItems(items), [items]);

  const itemsWithCounts = useMemo(() => {
    if (!definition.assetField) {
      return sortedItems.map((item) => ({ ...item, assetCount: 0 }));
    }

    const counts = buildAssetCountLookup(assets, definition.assetField);
    return sortedItems.map((item) => ({
      ...item,
      assetCount: counts.get(canonicalMasterDataName(item.name)) ?? 0,
    }));
  }, [assets, definition.assetField, sortedItems]);

  const handleBadgeClick = (item: MasterDataItem) => {
    if (!definition.assetField || (item.assetCount ?? 0) === 0) return;

    const condition = createFilterCondition({
      field: definition.assetField,
      operator: 'equals',
      value: item.name,
    });
    const filterGroup = createFilterGroup('AND', [condition]);
    const serialized = serializeFiltersToUrl(filterGroup);

    navigate(`/assets?filters=${serialized}`);
  };

  const form = useForm<FormValues>({
    initialValues: { name: '' },
    validate: {
      name: (value) => {
        const normalized = normalizeMasterDataName(value ?? '');
        if (!normalized) {
          return `${entityLabel} name is required`;
        }
        if (normalized.length > DEFAULT_MAX_LENGTH) {
          return `${entityLabel} name must be ${DEFAULT_MAX_LENGTH} characters or less`;
        }
        const canonical = canonicalMasterDataName(normalized);
        const isDuplicate = sortedItems.some(
          (item) => canonicalMasterDataName(item.name) === canonical && item.id !== editingId
        );
        if (isDuplicate) {
          return `A ${entityLabelLower} with this name already exists`;
        }
        return null;
      },
    },
  });

  const showSuccess = (title: string, message: string) => {
    notifications.show({
      title,
      message,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
  };

  const showError = (title: string, message: string) => {
    notifications.show({
      title,
      message,
      color: 'red',
      icon: <IconAlertCircle size={16} />,
    });
  };

  const handleAdd = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const created = await addItem(values.name);
      if (!created) {
        showError('Unable to add', `${entityLabel} already exists or name is invalid.`);
        return;
      }

      showSuccess('Success', `${entityLabel} "${created.name}" added`);
      form.reset();
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to add ${entityLabelLower}.`;
      showError('Failed to add', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: MasterDataItem) => {
    setEditingId(item.id);
    form.setFieldValue('name', item.name);
    setIsAdding(true);
  };

  const handleUpdate = async (values: FormValues) => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const normalized = normalizeMasterDataName(values.name);
      await updateItem(editingId, normalized);
      showSuccess('Success', `${entityLabel} updated`);
      form.reset();
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to update ${entityLabelLower}.`;
      showError('Failed to update', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: MasterDataItem) => {
    const target = itemsWithCounts.find((it) => it.id === item.id);
    if (target && (target.assetCount ?? 0) > 0) {
      notifications.show({
        title: 'Cannot Delete',
        message: `"${item.name}" has ${target.assetCount} asset(s). Please reassign or delete those assets first.`,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (!window.confirm(`Delete ${entityLabelLower} "${item.name}"?`)) {
      return;
    }

    setDeletingId(item.id);
    try {
      await deleteItem(item.id);
      showSuccess('Success', `${entityLabel} "${item.name}" deleted`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to delete ${entityLabelLower}.`;
      showError('Failed to delete', message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={3}>{title}</Title>
        <Text size="sm" c="dimmed" mt="xs">
          {description}
        </Text>
      </div>

      {!isAdding && (
        <Button leftSection={<IconPlus size={16} />} onClick={() => setIsAdding(true)} disabled={isLoading}>
          {addLabel}
        </Button>
      )}

      {isAdding && (
        <Card withBorder>
          <form
            onSubmit={form.onSubmit((values) => {
              if (editingId) {
                void handleUpdate(values);
              } else {
                void handleAdd(values);
              }
            })}
          >
            <Stack gap="md">
              <TextInput
                label={editingId ? `Edit ${entityLabel}` : `New ${entityLabel}`}
                placeholder={placeholder}
                leftSection={<IconComponent size={16} />}
                {...form.getInputProps('name')}
                autoFocus
              />

              <Group justify="flex-end">
                <Button
                  variant="default"
                  leftSection={<IconX size={16} />}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  leftSection={editingId ? <IconCheck size={16} /> : <IconPlus size={16} />}
                  disabled={!form.isValid() || isSaving}
                  loading={isSaving}
                >
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      )}

      {itemsWithCounts.length === 0 ? (
        isLoading ? (
          <Card withBorder>
            <Text size="sm">Loading {entityLabelLower}…</Text>
          </Card>
        ) : (
          <Alert color="blue" icon={<EmptyStateIcon size={16} />}>
            <Text size="sm">{emptyStateMessage}</Text>
          </Alert>
        )
      ) : (
        <Card withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tableColumnLabel}</Table.Th>
                <Table.Th>Assets</Table.Th>
                <Table.Th style={{ width: 50 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {itemsWithCounts.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconComponent size={16} />
                      <Text>{item.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={(item.assetCount ?? 0) > 0 ? 'blue' : 'gray'}
                      style={{
                        cursor: definition.assetField && (item.assetCount ?? 0) > 0 ? 'pointer' : 'default',
                      }}
                      onClick={() => handleBadgeClick(item)}
                    >
                      {item.assetCount ?? 0}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" shadow="md">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleEdit(item)}>
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => {
                            void handleDelete(item);
                          }}
                          disabled={(item.assetCount ?? 0) > 0 || deletingId === item.id}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {itemsWithCounts.length > 0 && (
        <Alert color="yellow" icon={<NoteIcon size={16} />} title="Note">
          <Text size="sm">{noteMessage}</Text>
        </Alert>
      )}
    </Stack>
  );
}
