 
import { useState, useEffect } from 'react';
import {
  TextInput,
  Textarea,
  NumberInput,
  Checkbox,
  Select,
  MultiSelect,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import type { CustomFieldDefinition, CustomFieldValue } from '../../types/entities';
import { PersonPicker } from '../common/PersonPicker';
import { personSearchService, type PersonSearchResult } from '../../services/person/PersonSearchService';

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value: CustomFieldValue | undefined;
  onChange: (value: CustomFieldValue) => void;
  error?: string;
  disabled?: boolean;
}

export function CustomFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: CustomFieldInputProps) {
  const { type, name, required, helpText, options, validation } = field;

  // State for person-reference field
  const [personData, setPersonData] = useState<PersonSearchResult | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  // Fetch person data when value changes (for person-reference fields)
  useEffect(() => {
    if (type === 'person-reference' && value && typeof value === 'string') {
      setLoadingPerson(true);
      personSearchService.getPersonById(value)
        .then((person) => {
          setPersonData(person);
        })
        .catch((err) => {
          console.error('Failed to load person data:', err);
          setPersonData(null);
        })
        .finally(() => {
          setLoadingPerson(false);
        });
    } else if (type !== 'person-reference' || !value) {
      setPersonData(null);
    }
  }, [type, value]);

  // Helper to validate input
  const getValidationProps = () => {
    const props: Record<string, unknown> = {};
    
    if (validation) {
      if (type === 'number') {
        if (validation.min !== undefined) props['min'] = validation.min;
        if (validation.max !== undefined) props['max'] = validation.max;
      }
      if (type === 'text' || type === 'long-text') {
        if (validation.minLength) props['minLength'] = validation.minLength;
        if (validation.maxLength) props['maxLength'] = validation.maxLength;
      }
    }
    
    return props;
  };

  const commonProps = {
    label: name,
    description: helpText,
    required,
    error,
    disabled,
    ...getValidationProps(),
  };

  switch (type) {
    case 'text':
      return (
        <TextInput
          {...commonProps}
          value={(value as string) || ''}
          onChange={(e) => {
            onChange(e.currentTarget.value);
          }}
          placeholder={`Enter ${name.toLowerCase()}`}
        />
      );

    case 'long-text':
      return (
        <Textarea
          {...commonProps}
          value={(value as string) || ''}
          onChange={(e) => {
            onChange(e.currentTarget.value);
          }}
          placeholder={`Enter ${name.toLowerCase()}`}
          rows={4}
        />
      );

    case 'number':
      return (
        <NumberInput
          {...commonProps}
          value={(value as number) || undefined}
          onChange={(val) => {
            onChange(typeof val === 'number' ? val : 0);
          }}
          placeholder={`Enter ${name.toLowerCase()}`}
        />
      );

    case 'date':
      return (
        <DateInput
          {...commonProps}
          value={value ? new Date(value as string) : undefined}
          onChange={(date) => {
            if (date) {
              onChange(date.toISOString());
            }
          }}
          placeholder={`Select ${name.toLowerCase()}`}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          {...commonProps}
          checked={(value as boolean) || false}
          onChange={(e) => {
            onChange(e.currentTarget.checked);
          }}
        />
      );

    case 'select':
      return (
        <Select
          {...commonProps}
          value={(value as string) || null}
          onChange={(val) => {
            if (val) {
              onChange(val);
            }
          }}
          data={options || []}
          placeholder={`Select ${name.toLowerCase()}`}
          clearable={!required}
        />
      );

    case 'multi-select':
      return (
        <MultiSelect
          {...commonProps}
          value={(value as string[] | undefined) || []}
          onChange={(vals) => {
            onChange(vals);
          }}
          data={options || []}
          placeholder={`Select ${name.toLowerCase()}`}
          clearable
        />
      );

    case 'url':
      return (
        <TextInput
          {...commonProps}
          type="url"
          value={(value as string) || ''}
          onChange={(e) => {
            onChange(e.currentTarget.value);
          }}
          placeholder="https://example.com"
        />
      );

    case 'person-reference':
      // Person search integrated from Phase 4
      return (
        <PersonPicker
          label={name}
          placeholder="Search for person..."
          value={loadingPerson ? {
            id: String(value),
            firstName: '',
            lastName: '',
            displayName: 'Loading...',
            email: '',
            avatarUrl: undefined,
            type: 'person',
          } : personData}
          onChange={(person) => {
            if (person) {
              setPersonData(person);
              onChange(person.id);
            } else {
              setPersonData(null);
              onChange('');
            }
          }}
          required={required}
          error={error}
          disabled={disabled}
        />
      );

    default:
      return (
        <TextInput
          {...commonProps}
          value={String(value || '')}
          onChange={(e) => {
            onChange(e.currentTarget.value);
          }}
          placeholder={`Enter ${name.toLowerCase()}`}
        />
      );
  }
}
