import { useState, useCallback, useEffect, useMemo, type RefObject } from 'react';
import { Autocomplete, Group, Avatar, Text, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconUser } from '@tabler/icons-react';

export interface PersonResult {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
}

interface PersonSearchProps {
  /** Currently selected person */
  value?: PersonResult | null;
  /** Callback when person is selected */
  onChange: (person: PersonResult | null) => void;
  /** Callback to search ChurchTools API */
  onSearch: (query: string) => Promise<PersonResult[]>;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search is disabled */
  disabled?: boolean;
  /** Label for the input */
  label?: string;
  /** Whether field is required */
  required?: boolean;
  /** Input reference for focus control */
  inputRef?: RefObject<HTMLInputElement>;
  /** Whether the field should autofocus on mount */
  autoFocus?: boolean;
}

/**
 * PersonSearch Component
 * 
 * Autocomplete search for ChurchTools persons.
 * Debounced API calls with avatar display.
 * 
 * @example
 * ```tsx
 * <PersonSearch
 *   value={assignedTo}
 *   onChange={setAssignedTo}
 *   onSearch={searchChurchToolsPersons}
 *   label="Assign to"
 *   required
 * />
 * ```
 */
export function PersonSearch({
  value,
  onChange,
  onSearch,
  placeholder = 'Search for a person...',
  disabled = false,
  label,
  required = false,
  inputRef,
  autoFocus = false,
}: PersonSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    onSearch(debouncedQuery)
      .then((persons) => {
        setResults(persons);
      })
      .catch((error) => {
        console.error('Person search error:', error);
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery, onSearch]);

  const handleChange = useCallback(
    (selectedValue: string) => {
      const person = results.find(
        (p) => `${p.firstName} ${p.lastName}` === selectedValue
      );
      if (person) {
        onChange(person);
        setSearchQuery(`${person.firstName} ${person.lastName}`);
      } else {
        onChange(null);
      }
    },
    [results, onChange]
  );

  // Set initial value
  useEffect(() => {
    if (value) {
      setSearchQuery(`${value.firstName} ${value.lastName}`);
    }
  }, [value]);

  const options = useMemo(() => {
    const seen = new Set<string>();
    return results
      .map((person) => {
        const label = `${person.firstName} ${person.lastName}`.trim();
        return {
          value: label,
          label,
          email: person.email,
          avatarUrl: person.avatarUrl,
        };
      })
      .filter((option) => {
        if (seen.has(option.value)) {
          return false;
        }
        seen.add(option.value);
        return true;
      });
  }, [results]);

  return (
    <Autocomplete
      ref={inputRef ?? undefined}
      label={label}
      placeholder={placeholder}
      value={searchQuery}
      onChange={setSearchQuery}
      onOptionSubmit={handleChange}
      data={options}
      renderOption={({ option }) => {
        const item = option as { value: string; label: string; email?: string; avatarUrl?: string };
        return (
          <Group gap="sm">
            <Avatar src={item.avatarUrl} size="sm" radius="xl">
              <IconUser size={16} />
            </Avatar>
            <div>
              <Text size="sm">{item.label}</Text>
              {item.email && (
                <Text size="xs" c="dimmed">
                  {item.email}
                </Text>
              )}
            </div>
          </Group>
        );
      }}
      rightSection={loading ? <Loader size="xs" /> : null}
      disabled={disabled}
      required={required}
  autoFocus={autoFocus}
      limit={10}
      maxDropdownHeight={300}
    />
  );
}
