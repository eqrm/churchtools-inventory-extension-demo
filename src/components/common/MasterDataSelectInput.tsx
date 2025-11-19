import { useEffect, useMemo, useState } from 'react';
import { Select, type SelectProps } from '@mantine/core';
import { canonicalMasterDataName, normalizeMasterDataName } from '../../utils/masterData';

const CREATE_PREFIX = '__create__';

interface MasterDataSelectInputProps
  extends Pick<
    SelectProps,
    | 'label'
    | 'placeholder'
    | 'description'
    | 'required'
    | 'descriptionProps'
    | 'error'
    | 'withAsterisk'
    | 'disabled'
  > {
    names: string[];
  value: string;
  onChange: (value: string) => void;
  nothingFound?: string;
    onBlur?: () => void;
    onCreateOption: (name: string) => string | Promise<string>;
}

export function MasterDataSelectInput({
    names,
  value,
  onChange,
  label,
  placeholder,
  description,
  required,
  descriptionProps,
  error,
  withAsterisk,
  disabled,
  nothingFound,
  onBlur,
    onCreateOption,
}: MasterDataSelectInputProps) {
  const [searchValue, setSearchValue] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setSearchValue('');
  }, [value]);

  const canonicalNames = useMemo(
    () => names.map((name) => canonicalMasterDataName(name)),
    [names]
  );

  const normalizedSearch = useMemo(() => normalizeMasterDataName(searchValue), [searchValue]);
  const shouldShowCreate = useMemo(() => {
    if (!normalizedSearch) return false;
    const canonicalSearch = canonicalMasterDataName(normalizedSearch);
    return !canonicalNames.includes(canonicalSearch);
  }, [canonicalNames, normalizedSearch]);

  const options = useMemo(() => {
    const items = names.map((name) => ({ value: name, label: name }));
    if (value) {
      const canonicalValue = canonicalMasterDataName(value);
      if (!canonicalNames.includes(canonicalValue)) {
        items.push({ value, label: value });
      }
    }
    if (shouldShowCreate && normalizedSearch) {
      items.unshift({
        value: `${CREATE_PREFIX}${normalizedSearch}`,
        label: `+ Add "${normalizedSearch}"`,
      });
    }
    return items;
  }, [names, value, canonicalNames, normalizedSearch, shouldShowCreate]);

  const handleChange = (selected: string | null) => {
    if (!selected) {
      onChange('');
      return;
    }

    if (selected.startsWith(CREATE_PREFIX)) {
      const raw = selected.slice(CREATE_PREFIX.length);
      const run = async () => {
        setIsCreating(true);
        try {
          const finalName = await Promise.resolve(onCreateOption(raw));
          onChange(finalName);
        } catch (error) {
          console.error('Failed to create master data entry', error);
        } finally {
          setSearchValue('');
          setIsCreating(false);
        }
      };

      void run();
      return;
    }

    onChange(selected);
    setSearchValue('');
  };

  return (
    <Select
      data={options}
      value={value.length > 0 ? value : null}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      description={description}
      descriptionProps={descriptionProps}
      required={required}
      error={error}
      withAsterisk={withAsterisk}
      searchable
      clearable
      allowDeselect
      nothingFoundMessage={nothingFound ?? 'No options'}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      disabled={disabled || isCreating}
      comboboxProps={{ withinPortal: false }}
      onBlur={onBlur}
    />
  );
}
