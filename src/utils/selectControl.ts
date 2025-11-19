import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';

export function toSelectValue(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value === '' ? null : value;
}

export function toMultiSelectValue(value?: string[] | null): string[] {
  return Array.isArray(value) ? value : [];
}

interface SelectBindingOptions<FormValues, Key extends keyof FormValues> {
  emptyValue?: FormValues[Key];
  parse?: (value: string) => FormValues[Key];
  format?: (value: FormValues[Key]) => string | null;
}

export function bindSelectField<FormValues, Key extends keyof FormValues>(
  form: UseFormReturnType<FormValues>,
  field: Key,
  options: SelectBindingOptions<FormValues, Key> = {}
) {
  const { onBlur } = form.getInputProps(field);

  const value = options.format
    ? options.format(form.values[field])
    : toSelectValue(form.values[field] as unknown as string | null | undefined);

  return {
    value,
    onChange: (next: string | null) => {
      if (!next) {
        const fallback =
          options.emptyValue !== undefined
            ? options.emptyValue
            : ((undefined as unknown) as FormValues[Key]);
        form.setFieldValue(field as string, fallback as unknown as never);
        return;
      }

      const parsed = options.parse ? options.parse(next) : ((next as unknown) as FormValues[Key]);
      form.setFieldValue(field as string, parsed as unknown as never);
    },
    error: (form.errors as Record<string, ReactNode | undefined>)[field as string],
    onBlur,
  };
}

interface MultiSelectBindingOptions<FormValues, Key extends keyof FormValues> {
  emptyValue?: FormValues[Key];
  parse?: (value: string[]) => FormValues[Key];
  format?: (value: FormValues[Key]) => string[];
}

export function bindMultiSelectField<FormValues, Key extends keyof FormValues>(
  form: UseFormReturnType<FormValues>,
  field: Key,
  options: MultiSelectBindingOptions<FormValues, Key> = {}
) {
  const { onBlur } = form.getInputProps(field);
  const formattedValue = options.format
    ? options.format(form.values[field])
    : toMultiSelectValue(form.values[field] as unknown as string[] | null | undefined);

  return {
    value: formattedValue,
    onChange: (next: string[]) => {
      if (next.length === 0) {
        const fallback =
          options.emptyValue !== undefined
            ? options.emptyValue
            : (([] as unknown) as FormValues[Key]);
        form.setFieldValue(field as string, fallback as unknown as never);
        return;
      }

      const parsed = options.parse ? options.parse(next) : ((next as unknown) as FormValues[Key]);
      form.setFieldValue(field as string, parsed as unknown as never);
    },
    error: (form.errors as Record<string, ReactNode | undefined>)[field as string],
    onBlur,
  };
}
