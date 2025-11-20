import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Combobox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { IconAdjustmentsHorizontal, IconPlus, IconTrash } from '@tabler/icons-react';
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FilterLogic,
  FilterOperator,
  RelativeDateFilterValue,
  ViewFilterCondition,
  ViewFilterGroup,
} from '../../types/entities';
import {
  createFilterCondition,
  createFilterGroup,
  isFilterGroup,
  normalizeFilterGroup,
} from '../../utils/viewFilters';
import { RelativeDateInput } from './RelativeDateInput';

export type FilterBuilderMode = 'auto' | 'quick' | 'advanced';

export interface FilterBuilderProps {
  value: ViewFilterGroup;
  onChange: (filters: ViewFilterGroup) => void;
  mode?: FilterBuilderMode;
}

type FilterFieldType = 'text' | 'number' | 'date';

interface FilterFieldConfig {
  value: string;
  label: string;
  type?: FilterFieldType;
}

const FILTER_FIELDS: FilterFieldConfig[] = [
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'assetNumber', label: 'Asset Number', type: 'text' },
  { value: 'status', label: 'Status', type: 'text' },
  { value: 'assetType.name', label: 'Asset Type', type: 'text' },
  { value: 'location', label: 'Location', type: 'text' },
  { value: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { value: 'model', label: 'Model', type: 'text' },
  { value: 'createdAt', label: 'Created date', type: 'date' },
  { value: 'lastModifiedAt', label: 'Updated date', type: 'date' },
  { value: 'nextMaintenance', label: 'Next maintenance', type: 'date' },
];

const FILTER_FIELD_MAP = new Map(FILTER_FIELDS.map((field) => [field.value, field]));

function getFilterFieldLabel(value?: string | null): string {
  if (!value) {
    return 'Select field';
  }
  return FILTER_FIELD_MAP.get(value)?.label ?? 'Select field';
}

const COMMON_FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
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

const RELATIVE_FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'relative-last', label: 'In last' },
  { value: 'relative-next', label: 'In next' },
];

const LOGIC_OPTIONS: { value: FilterLogic; label: string }[] = [
  { value: 'AND', label: 'Match all' },
  { value: 'OR', label: 'Match any' },
];

type RelativeDateOperator = Extract<FilterOperator, 'relative-last' | 'relative-next'>;

const RELATIVE_OPERATOR_SET = new Set<RelativeDateOperator>(['relative-last', 'relative-next']);

function getOperatorOptions(fieldName?: string): { value: FilterOperator; label: string }[] {
  const field = fieldName ? FILTER_FIELD_MAP.get(fieldName) : undefined;
  if (field?.type === 'date') {
    return [...COMMON_FILTER_OPERATORS, ...RELATIVE_FILTER_OPERATORS];
  }
  return COMMON_FILTER_OPERATORS;
}

function isRelativeOperator(operator?: FilterOperator | null): operator is RelativeDateOperator {
  return Boolean(operator) && RELATIVE_OPERATOR_SET.has(operator as RelativeDateOperator);
}

function ensureRelativeDateValue(value: unknown, operator: RelativeDateOperator): RelativeDateFilterValue {
  if (
    value &&
    typeof value === 'object' &&
    'amount' in (value as Record<string, unknown>) &&
    'unit' in (value as Record<string, unknown>)
  ) {
    const parsed = value as RelativeDateFilterValue;
    return {
      direction: operator === 'relative-last' ? 'last' : 'next',
      unit: parsed.unit ?? 'days',
      amount: Math.max(1, Number(parsed.amount) || 1),
    } satisfies RelativeDateFilterValue;
  }

  return {
    direction: operator === 'relative-last' ? 'last' : 'next',
    unit: 'days',
    amount: 7,
  } satisfies RelativeDateFilterValue;
}

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

function FilterBuilderComponent({ value, onChange, mode = 'auto' }: FilterBuilderProps) {
  const [tree, setTree] = useState<ViewFilterGroup>(() => normalizeFilterGroup(value));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    setTree(normalizeFilterGroup(value));
  }, [value]);

  const isQuickMode = mode === 'quick';
  const isAdvancedMode = mode === 'advanced';
  const canRenderCompact = useMemo(() => tree.children.every((child) => !isFilterGroup(child)), [tree]);
  const shouldRenderCompact = !isAdvancedMode && (isQuickMode || (mode === 'auto' && canRenderCompact));

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

  const handleRootLogicChange = useCallback(
    (logic: FilterLogic) => {
      commit((current) => replaceNode(current, tree.id, (node) => {
        if (!isFilterGroup(node)) {
          return node;
        }
        return {
          ...node,
          logic,
        } satisfies ViewFilterGroup;
      }));
    },
    [commit, tree.id],
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

  const handleAddFilterClick = useCallback(() => {
    if (canRenderCompact) {
      handleAddCondition(tree.id);
      return;
    }

    setIsAdvancedOpen(true);
  }, [canRenderCompact, handleAddCondition, tree.id]);

  const openAdvanced = useCallback(() => setIsAdvancedOpen(true), []);
  const closeAdvanced = useCallback(() => setIsAdvancedOpen(false), []);

  if (isAdvancedMode) {
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

  return (
    <>
      <Stack gap="sm">
        {shouldRenderCompact ? (
          <CompactFilterEditor
            group={tree}
            onConditionChange={handleConditionChange}
            onRemoveCondition={handleRemoveNode}
            onLogicChange={handleRootLogicChange}
          />
        ) : (
          <Alert color="yellow" variant="light">
            Nested filter groups are active. Open the advanced builder to edit them.
          </Alert>
        )}

        <Group justify="space-between" align="center">
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddFilterClick}>
            Add filter
          </Button>
          {!isQuickMode && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconAdjustmentsHorizontal size={14} />}
              onClick={openAdvanced}
            >
              Advanced builder
            </Button>
          )}
        </Group>
      </Stack>

      {!isQuickMode && (
        <Modal
          opened={isAdvancedOpen}
          onClose={closeAdvanced}
          title="Advanced filters"
          size="lg"
          withinPortal={false}
          overlayProps={{ opacity: 0.25 }}
        >
          <Stack gap="sm" pb="sm">
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
        </Modal>
      )}
    </>
  );
}

interface CompactFilterEditorProps {
  group: ViewFilterGroup;
  onConditionChange: (id: string, patch: Partial<ViewFilterCondition>) => void;
  onRemoveCondition: (id: string) => void;
  onLogicChange: (logic: FilterLogic) => void;
}

function CompactFilterEditor({ group, onConditionChange, onRemoveCondition, onLogicChange }: CompactFilterEditorProps) {
  const conditions = group.children.filter((child) => !isFilterGroup(child)) as ViewFilterCondition[];

  if (conditions.length === 0) {
    return (
      <Paper withBorder radius="sm" p="md">
        <Text size="sm" c="dimmed">
          No filters added yet. Use "Add filter" to get started.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="xs">
      {conditions.map((condition, index) => (
        <Fragment key={condition.id}>
          {index > 0 && <LogicConnector logic={group.logic} onChange={onLogicChange} />}
          <CompactConditionRow
            condition={condition}
            onChange={onConditionChange}
            onRemove={onRemoveCondition}
          />
        </Fragment>
      ))}
    </Stack>
  );
}

interface CompactConditionRowProps {
  condition: ViewFilterCondition;
  onChange: (id: string, patch: Partial<ViewFilterCondition>) => void;
  onRemove: (id: string) => void;
}

function CompactConditionRow({ condition, onChange, onRemove }: CompactConditionRowProps) {
  const operatorOptions = getOperatorOptions(condition.field);
  const isRelative = isRelativeOperator(condition.operator);
  const showValueInput = !isRelative && condition.operator !== 'is-empty' && condition.operator !== 'is-not-empty';
  const showRelativeInput = isRelativeOperator(condition.operator);

  const handleOperatorChange = (nextOperator: FilterOperator) => {
    const patch: Partial<ViewFilterCondition> = { operator: nextOperator };
    if (isRelativeOperator(nextOperator)) {
      patch.value = ensureRelativeDateValue(condition.value, nextOperator);
    } else if (isRelative) {
      patch.value = '';
    }
    onChange(condition.id, patch);
  };

  return (
    <Paper withBorder radius="sm" p="xs">
      <Group gap="xs" align="center" wrap="wrap" justify="space-between">
        <Group gap="xs" align="center" wrap="wrap" style={{ flex: 1, minWidth: 260 }}>
          <FieldSelector
            value={condition.field}
            onChange={(value) => onChange(condition.id, { field: value })}
          />
          <Select
            aria-label="Filter operator"
            placeholder="Operator"
            value={condition.operator ?? null}
            onChange={(value) => value && handleOperatorChange(value as FilterOperator)}
            data={operatorOptions}
            size="xs"
            w={160}
            comboboxProps={{ withinPortal: false }}
          />
          {showValueInput && (
            <TextInput
              placeholder="Value"
              value={String(condition.value ?? '')}
              onChange={(event) => onChange(condition.id, { value: event.currentTarget.value })}
              size="xs"
              style={{ flex: 1, minWidth: 160 }}
            />
          )}
          {showRelativeInput && isRelativeOperator(condition.operator) && (
            <RelativeDateInput
              operator={condition.operator}
              value={ensureRelativeDateValue(condition.value, condition.operator)}
              onChange={(nextValue) => onChange(condition.id, { value: nextValue })}
              onOperatorChange={(nextOperator) => handleOperatorChange(nextOperator)}
            />
          )}
        </Group>
        <ActionIcon
          color="gray"
          variant="subtle"
          onClick={() => onRemove(condition.id)}
          aria-label="Remove condition"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

interface FieldSelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
}

function FieldSelector({ value, onChange }: FieldSelectorProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Button
          size="xs"
          variant="light"
          onClick={() => combobox.toggleDropdown()}
        >
          {getFilterFieldLabel(value ?? undefined)}
        </Button>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search placeholder="Search fields" aria-label="Search fields" />
        <ScrollArea.Autosize mah={220} type="auto">
          <Combobox.Options>
            {FILTER_FIELDS.map((field) => (
              <Combobox.Option value={field.value} key={field.value}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="sm">{field.label}</Text>
                  {field.type && (
                    <Badge size="xs" variant="light" color="gray">
                      {field.type}
                    </Badge>
                  )}
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}

interface LogicConnectorProps {
  logic: FilterLogic;
  onChange: (logic: FilterLogic) => void;
}

function LogicConnector({ logic, onChange }: LogicConnectorProps) {
  return (
    <Group justify="center" align="center" gap="xs">
      <SegmentedControl
        size="xs"
        value={logic}
        onChange={(value) => onChange(value as FilterLogic)}
        data={LOGIC_OPTIONS}
        aria-label="Logical operator"
      />
      <Text size="xs" c="dimmed">
        {logic === 'AND' ? 'Match all filters' : 'Match any filter'}
      </Text>
    </Group>
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
  const operatorOptions = getOperatorOptions(condition.field);
  const isRelative = isRelativeOperator(condition.operator);
  const showValueInput = !isRelative && condition.operator !== 'is-empty' && condition.operator !== 'is-not-empty';
  const showRelativeInput = isRelativeOperator(condition.operator);

  const handleOperatorChange = (nextOperator: FilterOperator) => {
    const patch: Partial<ViewFilterCondition> = { operator: nextOperator };
    if (isRelativeOperator(nextOperator)) {
      patch.value = ensureRelativeDateValue(condition.value, nextOperator);
    } else if (isRelative) {
      patch.value = '';
    }
    onChange(condition.id, patch);
  };

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
        onChange={(value) => value && handleOperatorChange(value as FilterOperator)}
        data={operatorOptions}
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

      {showRelativeInput && isRelativeOperator(condition.operator) && (
        <RelativeDateInput
          operator={condition.operator}
          value={ensureRelativeDateValue(condition.value, condition.operator)}
          onChange={(nextValue) => onChange(condition.id, { value: nextValue })}
          onOperatorChange={(nextOperator) => handleOperatorChange(nextOperator)}
        />
      )}

      <ActionIcon color="red" variant="light" onClick={() => onRemove(condition.id)} aria-label="Remove condition">
        <IconTrash size={16} />
      </ActionIcon>
    </Group>
  );
}

export const FilterBuilder = memo(FilterBuilderComponent);
