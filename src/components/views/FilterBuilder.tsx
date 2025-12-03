import {
  ActionIcon,
  Alert,
  Combobox,
  Group,
  Modal,
  Pill,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconHash,
  IconLetterCase,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
  icon?: React.ReactNode;
}

const FILTER_FIELDS: FilterFieldConfig[] = [
  { value: 'name', label: 'Name', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'assetNumber', label: 'Asset #', type: 'text', icon: <IconHash size={14} /> },
  { value: 'status', label: 'Status', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'assetType.name', label: 'Type', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'location', label: 'Location', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'manufacturer', label: 'Manufacturer', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'model', label: 'Model', type: 'text', icon: <IconLetterCase size={14} /> },
  { value: 'createdAt', label: 'Created', type: 'date', icon: <IconCalendar size={14} /> },
  { value: 'lastModifiedAt', label: 'Updated', type: 'date', icon: <IconCalendar size={14} /> },
  { value: 'nextMaintenance', label: 'Next maint.', type: 'date', icon: <IconCalendar size={14} /> },
];

const FILTER_FIELD_MAP = new Map(FILTER_FIELDS.map((field) => [field.value, field]));

function getFilterFieldLabel(value?: string | null): string {
  if (!value) {
    return 'Field';
  }
  return FILTER_FIELD_MAP.get(value)?.label ?? 'Field';
}

function getFilterFieldIcon(value?: string | null): React.ReactNode | null {
  if (!value) return null;
  return FILTER_FIELD_MAP.get(value)?.icon ?? null;
}

// Compact operator labels for Notion-like UI
const COMMON_FILTER_OPERATORS: { value: FilterOperator; label: string; shortLabel: string }[] = [
  { value: 'equals', label: 'Is', shortLabel: 'is' },
  { value: 'not-equals', label: 'Is not', shortLabel: 'is not' },
  { value: 'contains', label: 'Contains', shortLabel: 'contains' },
  { value: 'not-contains', label: 'Does not contain', shortLabel: '!contains' },
  { value: 'starts-with', label: 'Starts with', shortLabel: 'starts' },
  { value: 'ends-with', label: 'Ends with', shortLabel: 'ends' },
  { value: 'greater-than', label: 'Greater than', shortLabel: '>' },
  { value: 'less-than', label: 'Less than', shortLabel: '<' },
  { value: 'in', label: 'In list', shortLabel: 'in' },
  { value: 'not-in', label: 'Not in list', shortLabel: 'not in' },
  { value: 'is-empty', label: 'Is empty', shortLabel: 'empty' },
  { value: 'is-not-empty', label: 'Is not empty', shortLabel: '!empty' },
];

const RELATIVE_FILTER_OPERATORS: { value: FilterOperator; label: string; shortLabel: string }[] = [
  { value: 'relative-last', label: 'In last', shortLabel: 'last' },
  { value: 'relative-next', label: 'In next', shortLabel: 'next' },
];

const LOGIC_OPTIONS: { value: FilterLogic; label: string }[] = [
  { value: 'AND', label: 'All' },
  { value: 'OR', label: 'Any' },
];

type RelativeDateOperator = Extract<FilterOperator, 'relative-last' | 'relative-next'>;

const RELATIVE_OPERATOR_SET = new Set<RelativeDateOperator>(['relative-last', 'relative-next']);

function getOperatorOptions(fieldName?: string): { value: FilterOperator; label: string; shortLabel: string }[] {
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
      <Stack gap="xs">
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
      <Stack gap={6}>
        {shouldRenderCompact ? (
          <CompactFilterEditor
            group={tree}
            onConditionChange={handleConditionChange}
            onRemoveCondition={handleRemoveNode}
            onLogicChange={handleRootLogicChange}
          />
        ) : (
          <Alert color="yellow" variant="light" p="xs">
            <Text size="xs">Nested filters active. Use advanced builder to edit.</Text>
          </Alert>
        )}

        <Group gap={6}>
          <Tooltip label="Add filter">
            <ActionIcon size="sm" variant="light" onClick={handleAddFilterClick}>
              <IconPlus size={14} />
            </ActionIcon>
          </Tooltip>
          {!isQuickMode && (
            <Tooltip label="Advanced builder">
              <ActionIcon size="sm" variant="subtle" onClick={openAdvanced}>
                <IconAdjustmentsHorizontal size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Stack>

      {!isQuickMode && (
        <Modal
          opened={isAdvancedOpen}
          onClose={closeAdvanced}
          title="Advanced filters"
          size="lg"
          withinPortal
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
      <Text size="xs" c="dimmed">
        No filters. Click + to add one.
      </Text>
    );
  }

  return (
    <Stack gap={6}>
      {conditions.length > 1 && (
        <Group gap={6}>
          <SegmentedControl
            size="xs"
            value={group.logic}
            onChange={(value) => onLogicChange(value as FilterLogic)}
            data={LOGIC_OPTIONS}
            styles={{ root: { backgroundColor: 'var(--mantine-color-gray-1)' } }}
          />
        </Group>
      )}
      {conditions.map((condition) => (
        <CompactConditionRow
          key={condition.id}
          condition={condition}
          onChange={onConditionChange}
          onRemove={onRemoveCondition}
        />
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
    <Group gap={4} wrap="nowrap" align="center" style={{ 
      background: 'var(--mantine-color-gray-0)', 
      borderRadius: 6, 
      padding: '4px 6px',
      border: '1px solid var(--mantine-color-gray-2)'
    }}>
      <FieldSelector
        value={condition.field}
        onChange={(value) => onChange(condition.id, { field: value })}
      />
      <Select
        aria-label="Filter operator"
        placeholder="..."
        value={condition.operator ?? null}
        onChange={(value) => value && handleOperatorChange(value as FilterOperator)}
        data={operatorOptions.map(o => ({ value: o.value, label: o.shortLabel }))}
        size="xs"
        w={90}
        styles={{ 
          input: { 
            minHeight: 28, 
            height: 28,
            fontSize: 12,
            paddingLeft: 8,
            paddingRight: 24,
          },
          wrapper: { minWidth: 80 }
        }}
        comboboxProps={{ withinPortal: true, width: 140 }}
      />
      {showValueInput && (
        <TextInput
          placeholder="value"
          value={String(condition.value ?? '')}
          onChange={(event) => onChange(condition.id, { value: event.currentTarget.value })}
          size="xs"
          style={{ flex: 1, minWidth: 80 }}
          styles={{ input: { minHeight: 28, height: 28, fontSize: 12 } }}
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
      <Tooltip label="Remove" position="top">
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          onClick={() => onRemove(condition.id)}
          aria-label="Remove filter"
        >
          <IconX size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
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

  const icon = getFilterFieldIcon(value ?? undefined);

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Pill
          size="sm"
          onClick={() => combobox.toggleDropdown()}
          style={{ 
            cursor: 'pointer', 
            backgroundColor: 'var(--mantine-color-blue-0)',
            color: 'var(--mantine-color-blue-7)',
            fontWeight: 500,
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          <Group gap={4} wrap="nowrap">
            {icon}
            {getFilterFieldLabel(value ?? undefined)}
          </Group>
        </Pill>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search placeholder="Search..." aria-label="Search fields" />
        <ScrollArea.Autosize mah={200} type="auto">
          <Combobox.Options>
            {FILTER_FIELDS.map((field) => (
              <Combobox.Option value={field.value} key={field.value}>
                <Group gap="xs" wrap="nowrap">
                  {field.icon}
                  <Text size="xs">{field.label}</Text>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
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
          <Text size="sm" fw={600}>{isRoot ? 'Where' : 'Group'}</Text>
          <SegmentedControl
            size="xs"
            value={group.logic}
            onChange={(value) => onChangeLogic(group.id, value as FilterLogic)}
            data={LOGIC_OPTIONS}
          />
        </Group>
        <Group gap={4}>
          <Tooltip label="Add condition">
            <ActionIcon size="sm" variant="light" onClick={() => onAddCondition(group.id)}>
              <IconPlus size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add group">
            <ActionIcon size="sm" variant="default" onClick={() => onAddGroup(group.id)}>
              <IconPlus size={14} />
            </ActionIcon>
          </Tooltip>
          {!isRoot && (
            <Tooltip label="Remove group">
              <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onRemoveNode(group.id)}>
                <IconX size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {group.children.length === 0 ? (
        <Text size="xs" c="dimmed">No filters.</Text>
      ) : (
        <Stack gap="xs" pl="sm" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}>
          {group.children.map((child) =>
            isFilterGroup(child) ? (
              <div key={child.id} style={{ 
                background: 'var(--mantine-color-gray-0)', 
                borderRadius: 6, 
                padding: 8 
              }}>
                <FilterGroupEditor
                  group={child}
                  onAddCondition={onAddCondition}
                  onAddGroup={onAddGroup}
                  onChangeLogic={onChangeLogic}
                  onRemoveNode={onRemoveNode}
                  onConditionChange={onConditionChange}
                />
              </div>
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
    <Group gap={4} wrap="nowrap" align="center">
      <Select
        placeholder="Field"
        value={condition.field}
        onChange={(value) => value && onChange(condition.id, { field: value })}
        data={FILTER_FIELDS.map(f => ({ value: f.value, label: f.label }))}
        size="xs"
        w={120}
        styles={{ input: { fontSize: 12 } }}
      />

      <Select
        placeholder="Op"
        value={condition.operator}
        onChange={(value) => value && handleOperatorChange(value as FilterOperator)}
        data={operatorOptions.map(o => ({ value: o.value, label: o.shortLabel }))}
        size="xs"
        w={90}
        styles={{ input: { fontSize: 12 } }}
      />

      {showValueInput && (
        <TextInput
          placeholder="value"
          value={String(condition.value ?? '')}
          onChange={(event) => onChange(condition.id, { value: event.currentTarget.value })}
          size="xs"
          style={{ flex: 1, minWidth: 100 }}
          styles={{ input: { fontSize: 12 } }}
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

      <Tooltip label="Remove">
        <ActionIcon size="xs" variant="subtle" color="red" onClick={() => onRemove(condition.id)}>
          <IconX size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

export const FilterBuilder = memo(FilterBuilderComponent);
