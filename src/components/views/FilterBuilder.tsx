import { Stack, Group, Select, TextInput, Button, ActionIcon, SegmentedControl, Text, Card } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useState } from 'react';
import type { FilterLogic, FilterOperator, ViewFilterCondition, ViewFilterGroup } from '../../types/entities';
import {
  createFilterCondition,
  createFilterGroup,
  isFilterGroup,
  normalizeFilterGroup,
} from '../../utils/viewFilters';

export interface FilterBuilderProps {
  value: ViewFilterGroup;
  onChange: (filters: ViewFilterGroup) => void;
}

const FILTER_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'assetNumber', label: 'Asset Number' },
  { value: 'status', label: 'Status' },
  { value: 'assetType.name', label: 'Asset Type' },
  { value: 'location', label: 'Location' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'model', label: 'Model' },
];

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not-equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not-contains', label: 'Does not contain' },
  { value: 'starts-with', label: 'Starts with' },
  { value: 'ends-with', label: 'Ends with' },
  { value: 'greater-than', label: 'Greater than' },
  { value: 'less-than', label: 'Less than' },
  { value: 'in', label: 'In list' },
  { value: 'not-in', label: 'Not in list' },
  { value: 'is-empty', label: 'Is empty' },
  { value: 'is-not-empty', label: 'Is not empty' },
];

const LOGIC_OPTIONS: { value: FilterLogic; label: string }[] = [
  { value: 'AND', label: 'Match all' },
  { value: 'OR', label: 'Match any' },
];

function replaceNode(
  root: ViewFilterGroup,
  targetId: string,
  replacer: (node: ViewFilterCondition | ViewFilterGroup) => ViewFilterCondition | ViewFilterGroup | null,
): ViewFilterGroup {
  const visit = (node: ViewFilterCondition | ViewFilterGroup): ViewFilterCondition | ViewFilterGroup | null => {
    if (node.id === targetId) {
      return replacer(node);
    }

    if (isFilterGroup(node)) {
      let changed = false;
      const children: Array<ViewFilterCondition | ViewFilterGroup> = [];

      node.children.forEach((child) => {
        const nextChild = visit(child);
        if (nextChild) {
          children.push(nextChild);
        }
        if (nextChild !== child) {
          changed = true;
        } else if (!nextChild) {
          changed = true;
        }
      });

      if (changed) {
        return {
          ...node,
          children,
        } satisfies ViewFilterGroup;
      }

      return node;
    }

    return node;
  };

  const updated = visit(root);
  if (!updated || !isFilterGroup(updated)) {
    return createFilterGroup('AND');
  }
  return updated;
}

function FilterBuilderComponent({ value, onChange }: FilterBuilderProps) {
  const [tree, setTree] = useState<ViewFilterGroup>(() => normalizeFilterGroup(value));

  useEffect(() => {
    setTree(normalizeFilterGroup(value));
  }, [value]);

  const commit = useCallback(
    (updater: (current: ViewFilterGroup) => ViewFilterGroup) => {
      setTree((current) => {
        const next = normalizeFilterGroup(updater(current));
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  const handleAddCondition = useCallback(
    (groupId: string) => {
      commit((current) =>
        replaceNode(current, groupId, (node) => {
          if (!isFilterGroup(node)) {
            return node;
          }
          return {
            ...node,
            children: [...node.children, createFilterCondition()],
          } satisfies ViewFilterGroup;
        }),
      );
    },
    [commit],
  );

  const handleAddGroup = useCallback(
    (groupId: string) => {
      commit((current) =>
        replaceNode(current, groupId, (node) => {
          if (!isFilterGroup(node)) {
            return node;
          }
          return {
            ...node,
            children: [...node.children, createFilterGroup('AND', [createFilterCondition()])],
          } satisfies ViewFilterGroup;
        }),
      );
    },
    [commit],
  );

  const handleChangeLogic = useCallback(
    (groupId: string, logic: FilterLogic) => {
      commit((current) =>
        replaceNode(current, groupId, (node) => {
          if (!isFilterGroup(node)) {
            return node;
          }
          return {
            ...node,
            logic,
          } satisfies ViewFilterGroup;
        }),
      );
    },
    [commit],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      if (nodeId === tree.id) {
        commit(() => createFilterGroup(tree.logic));
        return;
      }
      commit((current) => replaceNode(current, nodeId, () => null));
    },
    [commit, tree.id, tree.logic],
  );

  const handleConditionChange = useCallback(
    (conditionId: string, patch: Partial<ViewFilterCondition>) => {
      commit((current) =>
        replaceNode(current, conditionId, (node) => {
          if (isFilterGroup(node)) {
            return node;
          }
          return {
            ...node,
            ...patch,
          } satisfies ViewFilterCondition;
        }),
      );
    },
    [commit],
  );

  return (
    <Stack gap="sm">
      <FilterGroupEditor
        group={tree}
        isRoot
        onAddCondition={handleAddCondition}
        onAddGroup={handleAddGroup}
        onChangeLogic={handleChangeLogic}
        onRemoveNode={handleRemoveNode}
        onConditionChange={handleConditionChange}
      />
    </Stack>
  );
}

interface FilterGroupEditorProps {
  group: ViewFilterGroup;
  isRoot?: boolean;
  onAddCondition: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onChangeLogic: (groupId: string, logic: FilterLogic) => void;
  onRemoveNode: (nodeId: string) => void;
  onConditionChange: (conditionId: string, patch: Partial<ViewFilterCondition>) => void;
}

function FilterGroupEditor({
  group,
  isRoot,
  onAddCondition,
  onAddGroup,
  onChangeLogic,
  onRemoveNode,
  onConditionChange,
}: FilterGroupEditorProps) {
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Group gap="xs" align="center">
          <Text fw={600}>{isRoot ? 'Filters' : 'Group'}</Text>
          <SegmentedControl
            size="xs"
            value={group.logic}
            onChange={(value) => onChangeLogic(group.id, value as FilterLogic)}
            data={LOGIC_OPTIONS}
          />
        </Group>
        <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => onAddCondition(group.id)}>
            Add condition
          </Button>
          <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} onClick={() => onAddGroup(group.id)}>
            Add group
          </Button>
          {!isRoot && (
            <ActionIcon color="red" variant="subtle" onClick={() => onRemoveNode(group.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      {group.children.length === 0 ? (
        <Text size="sm" c="dimmed">
          No filters defined.
        </Text>
      ) : (
        <Stack gap="xs" pl="sm">
          {group.children.map((child) =>
            isFilterGroup(child) ? (
              <Card key={child.id} withBorder padding="sm" radius="sm">
                <FilterGroupEditor
                  group={child}
                  onAddCondition={onAddCondition}
                  onAddGroup={onAddGroup}
                  onChangeLogic={onChangeLogic}
                  onRemoveNode={onRemoveNode}
                  onConditionChange={onConditionChange}
                />
              </Card>
            ) : (
              <FilterConditionRow
                key={child.id}
                condition={child}
                onChange={onConditionChange}
                onRemove={onRemoveNode}
              />
            ),
          )}
        </Stack>
      )}
    </Stack>
  );
}

interface FilterConditionRowProps {
  condition: ViewFilterCondition;
  onChange: (id: string, patch: Partial<ViewFilterCondition>) => void;
  onRemove: (id: string) => void;
}

function FilterConditionRow({ condition, onChange, onRemove }: FilterConditionRowProps) {
  const showValueInput = condition.operator !== 'is-empty' && condition.operator !== 'is-not-empty';

  return (
    <Group gap="xs" align="flex-start" wrap="wrap">
      <Select
        placeholder="Field"
        value={condition.field}
        onChange={(value) => value && onChange(condition.id, { field: value })}
        data={FILTER_FIELDS}
        style={{ flex: 1, minWidth: 150 }}
        size="xs"
      />

      <Select
        placeholder="Operator"
        value={condition.operator}
        onChange={(value) => value && onChange(condition.id, { operator: value as FilterOperator })}
        data={FILTER_OPERATORS}
        style={{ flex: 1, minWidth: 150 }}
        size="xs"
      />

      {showValueInput && (
        <TextInput
          placeholder="Value"
          value={String(condition.value ?? '')}
          onChange={(event) => onChange(condition.id, { value: event.currentTarget.value })}
          style={{ flex: 2, minWidth: 200 }}
          size="xs"
        />
      )}

      <ActionIcon color="red" variant="light" onClick={() => onRemove(condition.id)} aria-label="Remove condition">
        <IconTrash size={16} />
      </ActionIcon>
    </Group>
  );
}

export const FilterBuilder = memo(FilterBuilderComponent);
