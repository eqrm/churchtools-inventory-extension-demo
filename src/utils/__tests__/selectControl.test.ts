import { describe, expect, it, vi } from 'vitest';
import type { UseFormReturnType } from '@mantine/form';
import {
  bindMultiSelectField,
  bindSelectField,
  toMultiSelectValue,
  toSelectValue,
} from '../selectControl';

function createFormStub<FormValues extends Record<string, unknown>>(values: FormValues) {
  const setFieldValue = vi.fn();
  const getInputProps = vi.fn(() => ({ onBlur: vi.fn() }));
  const errors: Record<string, unknown> = {};

  return {
    values,
    errors,
    setFieldValue,
    getInputProps,
  } as unknown as UseFormReturnType<FormValues>;
}

describe('selectControl helpers', () => {
  it('normalizes primitive values to Mantine-friendly select values', () => {
    expect(toSelectValue('abc')).toBe('abc');
    expect(toSelectValue('')).toBeNull();
    expect(toSelectValue(undefined)).toBeNull();
    expect(toSelectValue(null)).toBeNull();
  });

  it('normalizes multi-select arrays', () => {
    expect(toMultiSelectValue(['a', 'b'])).toEqual(['a', 'b']);
    expect(toMultiSelectValue(undefined)).toEqual([]);
    expect(toMultiSelectValue(null)).toEqual([]);
  });

  it('bindSelectField maps onChange payloads back into the form', () => {
    const form = createFormStub({ status: '' });
    const binding = bindSelectField(form, 'status', { emptyValue: '' });

    expect(binding.value).toBeNull();

    binding.onChange('active');
    expect(form.setFieldValue).toHaveBeenCalledWith('status', 'active');

    binding.onChange(null);
    expect(form.setFieldValue).toHaveBeenCalledWith('status', '');
  });

  it('bindMultiSelectField resets to empty arrays when cleared', () => {
    const form = createFormStub({ targetIds: ['a'] });
    const binding = bindMultiSelectField(form, 'targetIds');

    expect(binding.value).toEqual(['a']);

    binding.onChange([]);
    expect(form.setFieldValue).toHaveBeenCalledWith('targetIds', []);

    binding.onChange(['x', 'y']);
    expect(form.setFieldValue).toHaveBeenCalledWith('targetIds', ['x', 'y']);
  });
});
