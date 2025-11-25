/**
 * Tag Input Component
 * 
 * Multi-select input for managing tags on assets, kits, and models.
 * Displays tags as colored badges with add/remove functionality.
 */

import { useState } from 'react';
import { MultiSelect, Badge, Group, Text, ColorSwatch, Stack, Loader } from '@mantine/core';
import { IconTag, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Tag } from '../../types/tag';
import type { UUID } from '../../types/entities';
import { useTags } from '../../hooks/useTags';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { notifications } from '@mantine/notifications';

interface TagInputProps {
  /** All available tags */
  tags: Tag[];
  /** Currently selected tag IDs */
  selectedTagIds: UUID[];
  /** Callback when tags are added or removed */
  onChange: (tagIds: UUID[]) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Label for the input */
  label?: string;
  /** Description text */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
}

export function TagInput({
  tags,
  selectedTagIds,
  onChange,
  disabled = false,
  isLoading = false,
  error,
  label,
  description,
  placeholder,
}: TagInputProps) {
  const { t } = useTranslation('tags');
  const [searchValue, setSearchValue] = useState('');
  const { createTag } = useTags();
  const { data: currentUser } = useCurrentUser();

  // Convert tags to MultiSelect data format with color as part of the option
  const baseTagOptions = tags.map((tag) => ({
    value: tag.id,
    label: tag.name,
    color: tag.color,
  }));

  // Add "Create new tag" option when search doesn't match any existing tag
  const tagOptions = [...baseTagOptions];
  const CREATE_PREFIX = '__create__:';
  if (searchValue && !tags.some(tag => tag.name.toLowerCase() === searchValue.toLowerCase())) {
    tagOptions.unshift({
      value: `${CREATE_PREFIX}${searchValue}`,
      label: `${t('createTag')} "${searchValue}"`,
      color: '#868E96',
    });
  }

  // Get selected tags for badge display
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const handleChange = async (values: string[]) => {
    // Check if a "create" option was selected
    const createValue = values.find(v => v.startsWith(CREATE_PREFIX));
    if (createValue) {
      const tagName = createValue.substring(CREATE_PREFIX.length);
      try {
        const color = '#868E96';
        const createdBy = currentUser?.id ?? 'system';
        const newTag = await createTag({ name: tagName, color, createdBy });
        // Replace the create placeholder with the actual new tag ID
        const updatedValues = values.filter(v => v !== createValue).concat(newTag.id);
        onChange(updatedValues);
        setSearchValue('');
        notifications.show({ title: t('notifications.created'), message: tagName, color: 'green' });
      } catch (err) {
        notifications.show({ title: t('notifications.createError'), message: err instanceof Error ? err.message : String(err), color: 'red' });
      }
    } else {
      onChange(values);
    }
  };

  const handleRemoveTag = (tagId: UUID) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  // Helper to get tag color from options
  const getTagColor = (value: string) => {
    return baseTagOptions.find((opt) => opt.value === value)?.color || '#868E96';
  };

  return (
    <Stack gap="xs">
      <MultiSelect
        label={label || t('selectTags')}
        description={description}
        placeholder={placeholder || t('searchOrCreateTag')}
        data={tagOptions}
        value={selectedTagIds}
        onChange={handleChange}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        disabled={disabled || isLoading}
        error={error}
        leftSection={isLoading ? <Loader size="xs" /> : <IconTag size={16} />}
        rightSection={isLoading ? <Loader size="xs" /> : undefined}
        maxDropdownHeight={300}
        nothingFoundMessage={t('noTagsFound')}
        renderOption={({ option }) => {
          const isCreateOption = option.value.startsWith(CREATE_PREFIX);
          return (
            <Group gap="xs">
              {isCreateOption ? (
                <IconPlus size={16} />
              ) : (
                <ColorSwatch color={getTagColor(option.value)} size={16} />
              )}
              <Text size="sm">{option.label}</Text>
            </Group>
          );
        }}
      />

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <Group gap="xs">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              color={tag.color}
              variant="filled"
              style={{ cursor: disabled ? 'default' : 'pointer' }}
              onClick={disabled ? undefined : () => handleRemoveTag(tag.id)}
              leftSection={<ColorSwatch color={tag.color} size={12} />}
            >
              {tag.name}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
}

/**
 * Compact tag input without label or description
 */
interface CompactTagInputProps {
  tags: Tag[];
  selectedTagIds: UUID[];
  onChange: (tagIds: UUID[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function CompactTagInput({
  tags,
  selectedTagIds,
  onChange,
  disabled = false,
  isLoading = false,
}: CompactTagInputProps) {
  const { t } = useTranslation('tags');

  return (
    <TagInput
      tags={tags}
      selectedTagIds={selectedTagIds}
      onChange={onChange}
      disabled={disabled}
      isLoading={isLoading}
      placeholder={t('addTags')}
    />
  );
}

/**
 * Tag creation button component
 */
interface CreateTagButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CreateTagButton({ onClick, disabled = false }: CreateTagButtonProps) {
  const { t } = useTranslation('tags');

  return (
    <Badge
      color="gray"
      variant="light"
      leftSection={<IconPlus size={12} />}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={disabled ? undefined : onClick}
    >
      {t('createTag')}
    </Badge>
  );
}
