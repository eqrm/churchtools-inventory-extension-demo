/**
 * PersonPicker Component
 * Feature: 002-bug-fixes-ux-improvements (US2 - T039)
 * Purpose: Searchable person picker with avatar display
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TextInput, Paper, Stack, Group, Avatar, Text, Loader, ActionIcon } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'
import { usePersonSearch } from '../../hooks/usePersonSearch'
import type { PersonSearchResult } from '../../services/person/PersonSearchService'

export interface PersonPickerProps {
  value?: PersonSearchResult | null
  onChange: (person: PersonSearchResult | null) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
}

/**
 * T039, T041: PersonPicker component with search and avatar display
 */
 
export function PersonPicker(props: PersonPickerProps) {
  const {
    value,
    onChange,
    label = 'Person',
    placeholder = 'Search by name...',
    required = false,
    error,
    disabled = false
  } = props

  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { results, loading, error: searchError, search } = usePersonSearch()

  const uniqueResults = useMemo(() => {
    const seen = new Set<string>()
    return results.filter((person) => {
      if (seen.has(person.id)) {
        return false
      }
      seen.add(person.id)
      return true
    })
  }, [results])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      search(searchQuery)
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [searchQuery, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((person: PersonSearchResult) => {
    onChange(person)
    setSearchQuery('')
    setOpen(false)
  }, [onChange])

  const handleClear = useCallback(() => {
    onChange(null)
    setSearchQuery('')
  }, [onChange])

  const showNoResults = open && !loading && searchQuery.length >= 2 && uniqueResults.length === 0

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Show selected person inside the input field */}
      {value ? (
        <TextInput
          label={label}
          placeholder={placeholder}
          value={value.displayName}
          readOnly
          required={required}
          error={error}
          disabled={disabled}
          leftSection={
            <Avatar src={value.avatarUrl} alt={value.displayName} radius="xl" size="sm">
              {value.firstName[0]}{value.lastName[0]}
            </Avatar>
          }
          rightSection={
            !disabled && (
              <ActionIcon variant="subtle" color="gray" onClick={handleClear} size="sm">
                <IconX size={14} />
              </ActionIcon>
            )
          }
          styles={{
            input: {
              paddingLeft: '42px', // Make room for avatar
              cursor: disabled ? 'not-allowed' : 'pointer'
            }
          }}
          onClick={() => !disabled && handleClear()}
        />
      ) : (
        <TextInput
          label={label}
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          required={required}
          error={error || searchError || undefined}
          disabled={disabled}
          leftSection={<IconSearch size={16} />}
          rightSection={loading ? <Loader size="xs" /> : undefined}
        />
      )}

      {open && uniqueResults.length > 0 && (
        <Paper shadow="md" p="xs" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, marginTop: 4, maxHeight: 300, overflowY: 'auto' }}>
          <Stack gap="xs">
            {uniqueResults.map((person) => (
              <Paper key={person.id} p="xs" style={{ cursor: 'pointer' }} onClick={() => handleSelect(person)}>
                <Group gap="sm">
                  <Avatar src={person.avatarUrl} alt={person.displayName} radius="xl" size="sm">
                    {person.firstName[0]}{person.lastName[0]}
                  </Avatar>
                  <div>
                    <Text size="sm">{person.displayName}</Text>
                    {person.email && <Text size="xs" c="dimmed">{person.email}</Text>}
                  </div>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {showNoResults && (
        <Paper shadow="md" p="md" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, marginTop: 4 }}>
          <Text size="sm" c="dimmed" ta="center">
            No persons found matching &quot;{searchQuery}&quot;
          </Text>
        </Paper>
      )}
    </div>
  )
}
