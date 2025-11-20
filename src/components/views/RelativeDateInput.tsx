import { Group, NumberInput, SegmentedControl, Select } from '@mantine/core';
import type { FilterOperator, RelativeDateFilterValue } from '../../types/entities';

const RELATIVE_DIRECTION_OPTIONS: Array<{ value: RelativeDateDirectionOperator; label: string }> = [
  { value: 'relative-last', label: 'Last' },
  { value: 'relative-next', label: 'Next' },
];

export type RelativeDateDirectionOperator = Extract<FilterOperator, 'relative-last' | 'relative-next'>;

export interface RelativeDateInputProps {
  operator: RelativeDateDirectionOperator;
  value?: RelativeDateFilterValue;
  onChange: (value: RelativeDateFilterValue) => void;
  onOperatorChange?: (operator: RelativeDateDirectionOperator) => void;
}

export function RelativeDateInput({ operator, value, onChange, onOperatorChange }: RelativeDateInputProps) {
  const normalizedValue: RelativeDateFilterValue = {
    direction: operator === 'relative-last' ? 'last' : 'next',
    unit: value?.unit ?? 'days',
    amount: Math.max(1, value?.amount ?? 7),
  };

  const handleDirectionChange = (nextOperator: RelativeDateDirectionOperator) => {
    onOperatorChange?.(nextOperator);
    onChange({
      ...normalizedValue,
      direction: nextOperator === 'relative-last' ? 'last' : 'next',
    });
  };

  return (
    <Group gap="xs" wrap="wrap" align="center">
      <SegmentedControl
        size="xs"
        value={operator}
        data={RELATIVE_DIRECTION_OPTIONS}
        onChange={(value) => handleDirectionChange(value as RelativeDateDirectionOperator)}
        aria-label="Relative date direction"
      />
      <NumberInput
        size="xs"
        min={1}
        value={normalizedValue.amount}
        onChange={(value) =>
          onChange({
            ...normalizedValue,
            amount: Math.max(1, Number(value) || 1),
          })
        }
        aria-label="Relative date amount"
        maw={120}
      />
      <Select
        size="xs"
        data={[
          { value: 'days', label: 'Days' },
          { value: 'weeks', label: 'Weeks' },
          { value: 'months', label: 'Months' },
        ]}
        value={normalizedValue.unit}
        onChange={(value) => {
          if (!value) {
            return;
          }
          onChange({
            ...normalizedValue,
            unit: value as RelativeDateFilterValue['unit'],
          });
        }}
        aria-label="Relative date unit"
        maw={160}
      />
    </Group>
  );
}
