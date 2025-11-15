import { Stack, Group, Select, TextInput, Button, ActionIcon, SegmentedControl } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState, memo } from 'react';
import type { ViewFilter, FilterOperator } from '../../types/entities';

export interface FilterBuilderProps {
  filters: ViewFilter[];
  onChange: (filters: ViewFilter[]) => void;
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

function FilterBuilderComponent({ filters, onChange }: FilterBuilderProps) {
  const [currentFilters, setCurrentFilters] = useState<ViewFilter[]>(filters);

  const handleAddFilter = () => {
    const newFilter: ViewFilter = {
      field: 'name',
      operator: 'contains',
      value: '',
      logic: 'AND',
    };
    const updated = [...currentFilters, newFilter];
    setCurrentFilters(updated);
    onChange(updated);
  };

  const handleRemoveFilter = (index: number) => {
    const updated = currentFilters.filter((_, i) => i !== index);
    setCurrentFilters(updated);
    onChange(updated);
  };

  const handleUpdateFilter = (index: number, field: keyof ViewFilter, value: string) => {
    const updated = currentFilters.map((filter, i) =>
      i === index ? { ...filter, [field]: value } : filter,
    );
    setCurrentFilters(updated);
    onChange(updated);
  };

  return (
    <Stack gap="sm">
      {currentFilters.map((filter, index) => (
        <Group key={index} gap="xs" align="flex-start">
          {index > 0 && (
            <SegmentedControl
              size="xs"
              value={filter.logic || 'AND'}
              onChange={(value) => handleUpdateFilter(index, 'logic', value)}
              data={[
                { value: 'AND', label: 'AND' },
                { value: 'OR', label: 'OR' },
              ]}
              style={{ width: 100 }}
            />
          )}

          <Select
            placeholder="Field"
            value={filter.field}
            onChange={(value) => value && handleUpdateFilter(index, 'field', value)}
            data={FILTER_FIELDS}
            style={{ flex: 1, minWidth: 150 }}
          />

          <Select
            placeholder="Operator"
            value={filter.operator}
            onChange={(value) => value && handleUpdateFilter(index, 'operator', value as FilterOperator)}
            data={FILTER_OPERATORS}
            style={{ flex: 1, minWidth: 150 }}
          />

          {!['is-empty', 'is-not-empty'].includes(filter.operator) && (
            <TextInput
              placeholder="Value"
              value={String(filter.value)}
              onChange={(event) => handleUpdateFilter(index, 'value', event.currentTarget.value)}
              style={{ flex: 2, minWidth: 200 }}
            />
          )}

          <ActionIcon
            color="red"
            variant="light"
            onClick={() => handleRemoveFilter(index)}
            aria-label="Remove filter"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        leftSection={<IconPlus size={16} />}
        variant="light"
        onClick={handleAddFilter}
        fullWidth
      >
        Add filter
      </Button>
    </Stack>
  );
}

export const FilterBuilder = memo(FilterBuilderComponent);
