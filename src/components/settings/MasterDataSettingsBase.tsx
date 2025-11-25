import { useEffect, useMemo, useState, type ComponentType } from 'react';
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
  areMasterDataItemsEqual,
  buildAssetCountLookup,
  canonicalMasterDataName,
  createMasterDataItem,
  loadMasterData,
  normalizeMasterDataName,
  persistMasterData,
  sortMasterDataItems,
} from '../../utils/masterData';
import type { MasterDataDefinition, MasterDataItem } from '../../utils/masterData';

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
  const [items, setItems] = useState<MasterDataItem[]>(() => loadMasterData(definition));
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      const next = loadMasterData(definition);
      setItems((prev) => (areMasterDataItemsEqual(prev, next) ? prev : next));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== definition.storageKey) {
        return;
      }
      syncFromStorage();
    };

    window.addEventListener(definition.eventName, syncFromStorage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(definition.eventName, syncFromStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [definition]);

  const itemsWithCounts = useMemo(() => {
    if (!definition.assetField) {
      return items.map((item) => ({ ...item, assetCount: 0 }));
    }

    const counts = buildAssetCountLookup(assets, definition.assetField);
    return items.map((item) => ({
      ...item,
      assetCount: counts.get(canonicalMasterDataName(item.name)) ?? 0,
    }));
  }, [assets, definition.assetField, items]);

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
        const isDuplicate = items.some(
          (item) => canonicalMasterDataName(item.name) === canonical && item.id !== editingId
        );
        if (isDuplicate) {
          return `A ${entityLabelLower} with this name already exists`;
        }
        return null;
      },
    },
  });

  const commitItems = (nextItems: MasterDataItem[], notification: { title: string; message: string }) => {
    const sorted = sortMasterDataItems(nextItems);
    setItems(sorted);
    persistMasterData(definition, sorted);

    notifications.show({
      title: notification.title,
      message: notification.message,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
  };

  const handleAdd = (values: FormValues) => {
    const newItem = createMasterDataItem(values.name, definition);
    commitItems([...items, newItem], {
      title: 'Success',
      message: `${entityLabel} "${newItem.name}" added`,
    });
    form.reset();
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (item: MasterDataItem) => {
    setEditingId(item.id);
    form.setFieldValue('name', item.name);
    setIsAdding(true);
  };

  const handleUpdate = (values: FormValues) => {
    if (!editingId) return;

    const normalized = normalizeMasterDataName(values.name);
    const updated = items.map((item) =>
      item.id === editingId ? { ...item, name: normalized } : item
    );

    commitItems(updated, {
      title: 'Success',
      message: `${entityLabel} updated`,
    });

    form.reset();
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = (item: MasterDataItem) => {
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

    const filtered = items.filter((it) => it.id !== item.id);
    commitItems(filtered, {
      title: 'Success',
      message: `${entityLabel} "${item.name}" deleted`,
    });
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
        <Button leftSection={<IconPlus size={16} />} onClick={() => setIsAdding(true)}>
          {addLabel}
        </Button>
      )}

      {isAdding && (
        <Card withBorder>
          <form onSubmit={form.onSubmit(editingId ? handleUpdate : handleAdd)}>
            <Stack gap="md">
              <TextInput
                label={editingId ? `Edit ${entityLabel}` : `New ${entityLabel}`}
                placeholder={placeholder}
                leftSection={<IconComponent size={16} />}
                {...form.getInputProps('name')}
                autoFocus
              />

              <Group justify="flex-end">
                <Button variant="default" leftSection={<IconX size={16} />} onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  leftSection={editingId ? <IconCheck size={16} /> : <IconPlus size={16} />}
                  disabled={!form.isValid()}
                >
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      )}

      {itemsWithCounts.length === 0 ? (
        <Alert color="blue" icon={<EmptyStateIcon size={16} />}>
          <Text size="sm">{emptyStateMessage}</Text>
        </Alert>
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
                    <Badge color={(item.assetCount ?? 0) > 0 ? 'blue' : 'gray'}>
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
                          onClick={() => handleDelete(item)}
                          disabled={(item.assetCount ?? 0) > 0}
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
