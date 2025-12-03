/**
 * Notion-style filter bar with pill-based active filters and dropdown menus
 */
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Combobox,
  Divider,
  Group,
  Menu,
  Pill,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconHash,
  IconLetterCase,
  IconMapPin,
  IconPlus,
  IconTag,
  IconTrash,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { memo, useCallback, useMemo, useState } from 'react';
import type {
  FilterOperator,
  ViewFilterCondition,
  ViewFilterGroup,
} from '../../types/entities';
import {
  createFilterCondition,
  createFilterGroup,
  isFilterGroup,
  normalizeFilterGroup,
  countFilterConditions,
} from '../../utils/viewFilters';

export interface NotionFilterBarProps {
  quickFilters: ViewFilterGroup;
  advancedFilters: ViewFilterGroup;
  onQuickFiltersChange: (filters: ViewFilterGroup) => void;
  onAdvancedFiltersChange: (filters: ViewFilterGroup) => void;
  onClearAll?: () => void;
}

interface FilterFieldConfig {
  value: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  type: 'text' | 'select' | 'status' | 'date';
  options?: { value: string; label: string }[];
}

// Status options for the status field
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'in-repair', label: 'In Repair' },
  { value: 'broken', label: 'Broken' },
  { value: 'retired', label: 'Retired' },
  { value: 'installed', label: 'Installed' },
];

// Filter fields configuration
const FILTER_FIELDS: FilterFieldConfig[] = [
  { value: 'name', label: 'Name', shortLabel: 'Name', icon: <IconLetterCase size={14} />, type: 'text' },
  { value: 'assetNumber', label: 'Asset Number', shortLabel: 'Asset #', icon: <IconHash size={14} />, type: 'text' },
  { value: 'status', label: 'Status', shortLabel: 'Status', icon: <IconTag size={14} />, type: 'status', options: STATUS_OPTIONS },
  { value: 'assetType.name', label: 'Asset Type', shortLabel: 'Type', icon: <IconTag size={14} />, type: 'text' },
  { value: 'location', label: 'Location', shortLabel: 'Location', icon: <IconMapPin size={14} />, type: 'text' },
  { value: 'manufacturer', label: 'Manufacturer', shortLabel: 'Manufacturer', icon: <IconLetterCase size={14} />, type: 'text' },
  { value: 'model', label: 'Model', shortLabel: 'Model', icon: <IconLetterCase size={14} />, type: 'text' },
  { value: 'assetGroup.name', label: 'Asset Model', shortLabel: 'Model', icon: <IconUsers size={14} />, type: 'text' },
  { value: 'createdAt', label: 'Created', shortLabel: 'Created', icon: <IconCalendar size={14} />, type: 'date' },
  { value: 'lastModifiedAt', label: 'Last Updated', shortLabel: 'Updated', icon: <IconCalendar size={14} />, type: 'date' },
];

const FILTER_FIELD_MAP = new Map(FILTER_FIELDS.map((f) => [f.value, f]));

// Operators with short labels for pill display
const TEXT_OPERATORS: { value: FilterOperator; label: string; shortLabel: string }[] = [
  { value: 'contains', label: 'Contains', shortLabel: 'contains' },
  { value: 'not-contains', label: 'Does not contain', shortLabel: '≠' },
  { value: 'equals', label: 'Is', shortLabel: 'is' },
  { value: 'not-equals', label: 'Is not', shortLabel: 'is not' },
  { value: 'starts-with', label: 'Starts with', shortLabel: 'starts' },
  { value: 'ends-with', label: 'Ends with', shortLabel: 'ends' },
  { value: 'is-empty', label: 'Is empty', shortLabel: 'empty' },
  { value: 'is-not-empty', label: 'Is not empty', shortLabel: 'not empty' },
];

const SELECT_OPERATORS: { value: FilterOperator; label: string; shortLabel: string }[] = [
  { value: 'equals', label: 'Is', shortLabel: 'is' },
  { value: 'not-equals', label: 'Is not', shortLabel: 'is not' },
  { value: 'in', label: 'Is any of', shortLabel: 'in' },
  { value: 'not-in', label: 'Is none of', shortLabel: 'not in' },
];

function getOperatorsForField(field?: FilterFieldConfig) {
  if (!field) return TEXT_OPERATORS;
  if (field.type === 'status' || field.type === 'select') return SELECT_OPERATORS;
  return TEXT_OPERATORS;
}

function getOperatorLabel(operator?: FilterOperator | null): string {
  const allOps = [...TEXT_OPERATORS, ...SELECT_OPERATORS];
  return allOps.find((o) => o.value === operator)?.shortLabel ?? 'is';
}

function formatFilterPillLabel(condition: ViewFilterCondition): string {
  const field = FILTER_FIELD_MAP.get(condition.field ?? '');
  const fieldLabel = field?.shortLabel ?? condition.field ?? 'Field';
  const opLabel = getOperatorLabel(condition.operator);
  
  if (condition.operator === 'is-empty' || condition.operator === 'is-not-empty') {
    return `${fieldLabel} ${opLabel}`;
  }
  
  const value = condition.value;
  let valueLabel = '';
  
  if (Array.isArray(value)) {
    valueLabel = value.length > 2 
      ? `${value.slice(0, 2).join(', ')}...` 
      : value.join(', ');
  } else if (value) {
    valueLabel = String(value);
    if (valueLabel.length > 15) {
      valueLabel = valueLabel.slice(0, 15) + '...';
    }
  }
  
  return valueLabel ? `${fieldLabel}: ${valueLabel}` : `${fieldLabel} ${opLabel}`;
}

// Individual filter pill with popover editor
interface FilterPillProps {
  condition: ViewFilterCondition;
  onChange: (patch: Partial<ViewFilterCondition>) => void;
  onDelete: () => void;
  onAddToAdvanced?: () => void;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function FilterPill({ condition, onChange, onDelete, onAddToAdvanced, defaultOpen = false, onOpenChange }: FilterPillProps) {
  const [opened, setOpened] = useState(defaultOpen);
  const [operatorMenuOpen, setOperatorMenuOpen] = useState(false);
  const field = FILTER_FIELD_MAP.get(condition.field ?? '');
  const operators = getOperatorsForField(field);
  const showValueInput = condition.operator !== 'is-empty' && condition.operator !== 'is-not-empty';
  
  const label = formatFilterPillLabel(condition);
  const icon = field?.icon ?? <IconFilter size={14} />;

  const handleOpenChange = (open: boolean) => {
    // Don't close if operator menu is open
    if (!open && operatorMenuOpen) return;
    setOpened(open);
    onOpenChange?.(open);
  };

  const handleOperatorChange = (op: FilterOperator) => {
    onChange({ operator: op });
    setOperatorMenuOpen(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={handleOpenChange}
      position="bottom-start"
      shadow="md"
      withinPortal
      trapFocus
    >
      <Popover.Target>
        <Badge
          size="lg"
          variant="filled"
          color="blue"
          style={{ cursor: 'pointer', textTransform: 'none', fontWeight: 500 }}
          leftSection={icon}
          rightSection={
            <ActionIcon
              size={16}
              radius="xl"
              variant="transparent"
              color="white"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <IconX size={12} />
            </ActionIcon>
          }
          onClick={() => setOpened(true)}
        >
          {label}
        </Badge>
      </Popover.Target>

      <Popover.Dropdown p="sm" miw={280}>
        <Stack gap="xs">
          {/* Header with field name and operator */}
          <Group justify="space-between" gap="xs">
            <Group gap={4}>
              <Text size="sm" c="dimmed">{field?.label ?? 'Field'}</Text>
              <Menu 
                opened={operatorMenuOpen}
                onChange={setOperatorMenuOpen}
                position="bottom-start" 
                shadow="sm" 
                withinPortal
              >
                <Menu.Target>
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="gray"
                    rightSection={<IconChevronDown size={12} />}
                  >
                    {operators.find(o => o.value === condition.operator)?.label ?? 'contains'}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {operators.map((op) => (
                    <Menu.Item
                      key={op.value}
                      onClick={() => handleOperatorChange(op.value)}
                      rightSection={condition.operator === op.value ? <IconCheck size={14} /> : null}
                    >
                      {op.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
            <Menu position="bottom-end" shadow="sm" withinPortal>
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle" color="gray">
                  <IconAdjustmentsHorizontal size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    onDelete();
                    setOpened(false);
                  }}
                >
                  Delete filter
                </Menu.Item>
                {onAddToAdvanced && (
                  <Menu.Item
                    leftSection={<IconAdjustmentsHorizontal size={14} />}
                    onClick={() => {
                      onAddToAdvanced();
                      setOpened(false);
                    }}
                  >
                    Add to advanced filter
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>

          {/* Value input */}
          {showValueInput && (
            <>
              {field?.type === 'status' && field.options ? (
                <MultiSelectValue
                  options={field.options}
                  value={Array.isArray(condition.value) ? condition.value : condition.value ? [String(condition.value)] : []}
                  onChange={(vals) => onChange({ value: vals.length === 1 ? vals[0] : vals })}
                />
              ) : (
                <TextInput
                  size="sm"
                  placeholder="Type a value..."
                  value={String(condition.value ?? '')}
                  onChange={(e) => onChange({ value: e.currentTarget.value })}
                  autoFocus
                />
              )}
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// Multi-select value component for status/select fields
interface MultiSelectValueProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

function MultiSelectValue({ options, value, onChange }: MultiSelectValueProps) {
  const toggleOption = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <Stack gap={4}>
      {/* Selected values as pills */}
      {value.length > 0 && (
        <Group gap={4}>
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <Pill
                key={v}
                size="sm"
                withRemoveButton
                onRemove={() => toggleOption(v)}
              >
                {opt?.label ?? v}
              </Pill>
            );
          })}
        </Group>
      )}
      
      {/* Options list */}
      <ScrollArea.Autosize mah={150}>
        <Stack gap={2}>
          {options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <Group
                key={opt.value}
                gap="xs"
                p={4}
                style={{
                  cursor: 'pointer',
                  borderRadius: 4,
                  backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
                }}
                onClick={() => toggleOption(opt.value)}
              >
                {isSelected && <IconCheck size={14} color="var(--mantine-color-blue-6)" />}
                <Text size="xs">{opt.label}</Text>
              </Group>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

// Field selector dropdown (Notion-style)
interface AddFilterDropdownProps {
  onSelectField: (field: string) => void;
  advancedRuleCount?: number;
}

function AddFilterDropdown({ onSelectField, advancedRuleCount = 0 }: AddFilterDropdownProps) {
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch('');
    },
  });

  const filteredFields = useMemo(() => {
    if (!search) return FILTER_FIELDS;
    const lower = search.toLowerCase();
    return FILTER_FIELDS.filter(
      (f) => f.label.toLowerCase().includes(lower) || f.shortLabel.toLowerCase().includes(lower)
    );
  }, [search]);

  return (
    <Combobox
      store={combobox}
      withinPortal
      position="bottom-start"
      offset={4}
      onOptionSubmit={(val) => {
        onSelectField(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          onClick={() => combobox.toggleDropdown()}
        >
          Filter
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown miw={220}>
        <Combobox.Search
          placeholder="Filter by..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        
        <ScrollArea.Autosize mah={250} type="auto">
          <Combobox.Options>
            {filteredFields.map((field) => (
              <Combobox.Option value={field.value} key={field.value}>
                <Group gap="xs" wrap="nowrap">
                  {field.icon}
                  <span>{field.label}</span>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </ScrollArea.Autosize>

        {advancedRuleCount > 0 && (
          <>
            <Divider my={4} />
            <Box p="xs">
              <Group gap="xs" wrap="nowrap">
                <IconAdjustmentsHorizontal size={14} />
                <Text size="sm" c="dimmed">{advancedRuleCount} advanced rules</Text>
              </Group>
            </Box>
          </>
        )}
      </Combobox.Dropdown>
    </Combobox>
  );
}

// Nested filter group component (recursive for Or groups)
interface FilterGroupRowProps {
  group: ViewFilterGroup;
  isNested?: boolean;
  parentLogic?: 'AND' | 'OR';
  onChange: (group: ViewFilterGroup) => void;
  onDelete?: () => void;
}

function FilterGroupRow({ 
  group, 
  isNested = false, 
  parentLogic,
  onChange, 
  onDelete 
}: FilterGroupRowProps) {
  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({ ...group, logic });
  };

  const handleAddCondition = () => {
    const newCondition = createFilterCondition({ field: 'name', operator: 'contains', value: '' });
    onChange({
      ...group,
      children: [...group.children, newCondition],
    });
  };

  const handleAddGroup = () => {
    const newGroup = createFilterGroup('AND', [
      createFilterCondition({ field: 'name', operator: 'contains', value: '' }),
    ]);
    onChange({
      ...group,
      children: [...group.children, newGroup],
    });
  };

  const handleChildChange = (index: number, child: ViewFilterGroup | ViewFilterCondition) => {
    const newChildren = [...group.children];
    newChildren[index] = child;
    onChange({ ...group, children: newChildren });
  };

  const handleChildDelete = (index: number) => {
    onChange({
      ...group,
      children: group.children.filter((_, i) => i !== index),
    });
  };

  const handleConditionChange = (index: number, patch: Partial<ViewFilterCondition>) => {
    const newChildren = [...group.children];
    const child = newChildren[index];
    if (child && !isFilterGroup(child)) {
      newChildren[index] = { ...child, ...patch };
      onChange({ ...group, children: newChildren });
    }
  };

  // Flatten conditions for display
  let itemIndex = 0;

  return (
    <Box
      style={{
        backgroundColor: isNested ? 'var(--mantine-color-gray-1)' : undefined,
        borderRadius: isNested ? 8 : 0,
        border: isNested ? '1px solid var(--mantine-color-gray-3)' : undefined,
        marginLeft: isNested ? 8 : 0,
        marginRight: isNested ? 8 : 0,
        marginBottom: isNested ? 8 : 0,
      }}
    >
      {/* Logic toggle for nested groups */}
      {isNested && (
        <Group gap={4} p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Menu position="bottom-start" shadow="sm" withinPortal>
            <Menu.Target>
              <Button
                size="compact-xs"
                variant="filled"
                color="dark"
                rightSection={<IconChevronDown size={10} />}
              >
                {parentLogic === 'OR' ? 'Or' : 'And'}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => onDelete?.()}>
                Remove group
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {onDelete && (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              ml="auto"
              onClick={onDelete}
            >
              <IconX size={12} />
            </ActionIcon>
          )}
        </Group>
      )}

      {/* Children (conditions and nested groups) */}
      <Stack gap={0}>
        {group.children.map((child, index) => {
          if (isFilterGroup(child)) {
            return (
              <FilterGroupRow
                key={child.id}
                group={child}
                isNested={true}
                parentLogic={group.logic}
                onChange={(updated) => handleChildChange(index, updated)}
                onDelete={() => handleChildDelete(index)}
              />
            );
          }
          
          const currentIndex = itemIndex;
          itemIndex++;
          return (
            <AdvancedFilterRow
              key={child.id}
              condition={child}
              isFirst={currentIndex === 0 && !isNested}
              showLogic={currentIndex > 0 || isNested}
              logic={group.logic}
              onLogicChange={currentIndex === 1 && !isNested ? handleLogicChange : undefined}
              onChange={(patch) => handleConditionChange(index, patch)}
              onDelete={() => handleChildDelete(index)}
            />
          );
        })}
      </Stack>

      {/* Add filter rule / Add group */}
      <Box p="xs">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconPlus size={14} />}
            onClick={handleAddCondition}
          >
            Add filter rule
          </Button>
          {!isNested && (
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddGroup}
            >
              Add filter group
            </Button>
          )}
        </Group>
      </Box>
    </Box>
  );
}

// Advanced rules pill (shows count, opens advanced editor with nested groups)
interface AdvancedRulesPillProps {
  count: number;
  filters: ViewFilterGroup;
  onChange: (filters: ViewFilterGroup) => void;
}

function AdvancedRulesPill({ count, filters, onChange }: AdvancedRulesPillProps) {
  const [opened, setOpened] = useState(false);
  
  if (count === 0) return null;

  const handleDeleteAll = () => {
    onChange(createFilterGroup('AND'));
    setOpened(false);
  };
  
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      shadow="lg"
      withinPortal
      trapFocus
    >
      <Popover.Target>
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconAdjustmentsHorizontal size={14} />}
          rightSection={<IconChevronDown size={12} />}
          onClick={() => setOpened(!opened)}
        >
          {count} {count === 1 ? 'rule' : 'rules'}
        </Button>
      </Popover.Target>

      <Popover.Dropdown p={0} miw={500}>
        <Stack gap={0}>
          {/* Recursive filter group rendering */}
          <FilterGroupRow
            group={filters}
            onChange={onChange}
          />

          <Divider />

          {/* Delete all */}
          <Box p="xs">
            <Button
              variant="subtle"
              color="red"
              size="compact-sm"
              leftSection={<IconTrash size={14} />}
              onClick={handleDeleteAll}
            >
              Delete filter
            </Button>
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// Single row in the advanced filter popover (Notion-style)
interface AdvancedFilterRowProps {
  condition: ViewFilterCondition;
  isFirst: boolean;
  showLogic?: boolean;
  logic: 'AND' | 'OR';
  onLogicChange?: (logic: 'AND' | 'OR') => void;
  onChange: (patch: Partial<ViewFilterCondition>) => void;
  onDelete: () => void;
}

function AdvancedFilterRow({ 
  condition, 
  isFirst, 
  showLogic = true,
  logic, 
  onLogicChange,
  onChange, 
  onDelete 
}: AdvancedFilterRowProps) {
  const field = FILTER_FIELD_MAP.get(condition.field ?? '');
  const operators = getOperatorsForField(field);
  const showValueInput = condition.operator !== 'is-empty' && condition.operator !== 'is-not-empty';

  const logicLabel = isFirst ? 'Where' : logic === 'AND' ? 'And' : 'Or';

  return (
    <Group gap={4} p="xs" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      {/* Where / And / Or - clickable if can change logic */}
      {showLogic && (
        <>
          {onLogicChange && !isFirst ? (
            <Menu position="bottom-start" shadow="sm" withinPortal>
              <Menu.Target>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  w={50}
                  rightSection={<IconChevronDown size={10} />}
                >
                  {logicLabel}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  onClick={() => onLogicChange('AND')}
                  rightSection={logic === 'AND' ? <IconCheck size={14} /> : null}
                >
                  And
                </Menu.Item>
                <Menu.Item
                  onClick={() => onLogicChange('OR')}
                  rightSection={logic === 'OR' ? <IconCheck size={14} /> : null}
                >
                  Or
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Text size="sm" w={50} c="dimmed">
              {logicLabel}
            </Text>
          )}
        </>
      )}

      {/* Field selector */}
      <Menu position="bottom-start" shadow="sm" withinPortal>
        <Menu.Target>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            leftSection={field?.icon}
            rightSection={<IconChevronDown size={12} />}
            style={{ minWidth: 120 }}
          >
            {field?.label ?? 'Field'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {FILTER_FIELDS.map((f) => (
            <Menu.Item
              key={f.value}
              leftSection={f.icon}
              onClick={() => onChange({ field: f.value })}
              rightSection={condition.field === f.value ? <IconCheck size={14} /> : null}
            >
              {f.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      {/* Operator selector */}
      <Menu position="bottom-start" shadow="sm" withinPortal>
        <Menu.Target>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            rightSection={<IconChevronDown size={12} />}
            ml={4}
          >
            {operators.find(o => o.value === condition.operator)?.label ?? 'contains'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {operators.map((op) => (
            <Menu.Item
              key={op.value}
              onClick={() => onChange({ operator: op.value })}
              rightSection={condition.operator === op.value ? <IconCheck size={14} /> : null}
            >
              {op.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      {/* Value input */}
      {showValueInput && (
        <>
          {field?.type === 'status' && field.options ? (
            <Menu position="bottom-start" shadow="sm" withinPortal>
              <Menu.Target>
                <Button
                  size="compact-sm"
                  variant="filled"
                  color="dark"
                  rightSection={<IconChevronDown size={12} />}
                  ml={4}
                  style={{ minWidth: 100 }}
                >
                  {(() => {
                    if (Array.isArray(condition.value) && condition.value.length > 0) {
                      return condition.value.map(v => field.options?.find(o => o.value === v)?.label ?? v).join(', ');
                    }
                    if (condition.value) {
                      return field.options?.find(o => o.value === condition.value)?.label ?? String(condition.value);
                    }
                    return 'Select...';
                  })()}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {field.options.map((opt) => {
                  const isSelected = Array.isArray(condition.value)
                    ? condition.value.includes(opt.value)
                    : condition.value === opt.value;
                  return (
                    <Menu.Item
                      key={opt.value}
                      onClick={() => {
                        if (Array.isArray(condition.value)) {
                          const newVal = isSelected
                            ? condition.value.filter(v => v !== opt.value)
                            : [...condition.value, opt.value];
                          onChange({ value: newVal });
                        } else {
                          onChange({ value: opt.value });
                        }
                      }}
                      rightSection={isSelected ? <IconCheck size={14} /> : null}
                    >
                      {opt.label}
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
          ) : (
            <TextInput
              size="xs"
              placeholder="Type a value..."
              value={String(condition.value ?? '')}
              onChange={(e) => onChange({ value: e.currentTarget.value })}
              ml={4}
              style={{ flex: 1, minWidth: 100 }}
            />
          )}
        </>
      )}

      {/* Delete button */}
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        ml="auto"
        onClick={onDelete}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}

function NotionFilterBarComponent({
  quickFilters,
  advancedFilters,
  onQuickFiltersChange,
  onAdvancedFiltersChange,
  onClearAll,
}: NotionFilterBarProps) {
  // Track the ID of a newly added filter so we can auto-open its popover
  const [newFilterId, setNewFilterId] = useState<string | null>(null);
  
  const normalizedQuick = useMemo(() => normalizeFilterGroup(quickFilters), [quickFilters]);
  const normalizedAdvanced = useMemo(() => normalizeFilterGroup(advancedFilters), [advancedFilters]);
  
  const quickConditions = useMemo(() => {
    return normalizedQuick.children.filter((c) => !isFilterGroup(c)) as ViewFilterCondition[];
  }, [normalizedQuick]);
  
  const advancedCount = useMemo(() => countFilterConditions(normalizedAdvanced), [normalizedAdvanced]);
  const totalCount = quickConditions.length + advancedCount;
  const hasFilters = totalCount > 0;

  const handleAddFilter = useCallback((field: string) => {
    // Use appropriate default operator based on field type
    const fieldConfig = FILTER_FIELD_MAP.get(field);
    const defaultOperator: FilterOperator = 
      fieldConfig?.type === 'status' || fieldConfig?.type === 'select' ? 'in' : 'contains';
    const newCondition = createFilterCondition({ field, operator: defaultOperator, value: fieldConfig?.type === 'status' ? [] : '' });
    const updated: ViewFilterGroup = {
      ...normalizedQuick,
      children: [...normalizedQuick.children, newCondition],
    };
    // Track this as a new filter so it opens automatically
    setNewFilterId(newCondition.id);
    onQuickFiltersChange(updated);
  }, [normalizedQuick, onQuickFiltersChange]);

  const handleConditionChange = useCallback((id: string, patch: Partial<ViewFilterCondition>) => {
    const updated: ViewFilterGroup = {
      ...normalizedQuick,
      children: normalizedQuick.children.map((child) => {
        if (isFilterGroup(child) || child.id !== id) return child;
        return { ...child, ...patch };
      }),
    };
    onQuickFiltersChange(updated);
  }, [normalizedQuick, onQuickFiltersChange]);

  const handleDeleteCondition = useCallback((id: string) => {
    const updated: ViewFilterGroup = {
      ...normalizedQuick,
      children: normalizedQuick.children.filter((child) => child.id !== id),
    };
    onQuickFiltersChange(updated);
  }, [normalizedQuick, onQuickFiltersChange]);

  const handleClearAll = useCallback(() => {
    onQuickFiltersChange(createFilterGroup('AND'));
    onAdvancedFiltersChange(createFilterGroup('AND'));
    onClearAll?.();
  }, [onQuickFiltersChange, onAdvancedFiltersChange, onClearAll]);

  return (
    <Group gap="xs" wrap="wrap" align="center">
      {/* Advanced rules pill */}
      <AdvancedRulesPill 
        count={advancedCount} 
        filters={normalizedAdvanced}
        onChange={onAdvancedFiltersChange}
      />

      {/* Quick filter pills */}
      {quickConditions.map((condition) => (
        <FilterPill
          key={condition.id}
          condition={condition}
          onChange={(patch) => {
            handleConditionChange(condition.id, patch);
            // Clear newFilterId once user interacts
            if (newFilterId === condition.id) setNewFilterId(null);
          }}
          onDelete={() => handleDeleteCondition(condition.id)}
          onAddToAdvanced={() => {
            // Move to advanced filters
            const updated: ViewFilterGroup = {
              ...normalizedAdvanced,
              children: [...normalizedAdvanced.children, condition],
            };
            onAdvancedFiltersChange(updated);
            handleDeleteCondition(condition.id);
          }}
          defaultOpen={condition.id === newFilterId}
        />
      ))}

      {/* Add filter button */}
      <AddFilterDropdown
        onSelectField={handleAddFilter}
        advancedRuleCount={advancedCount}
      />

      {/* Clear all (if has filters) */}
      {hasFilters && (
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          onClick={handleClearAll}
        >
          Reset
        </Button>
      )}
    </Group>
  );
}

export const NotionFilterBar = memo(NotionFilterBarComponent);
