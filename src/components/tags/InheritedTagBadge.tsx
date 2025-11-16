/**
 * Inherited Tag Badge Component
 * 
 * Displays a tag badge with an indicator showing it's inherited from a parent entity.
 * Shows the source (kit or model) in a tooltip and prevents removal.
 */

import { Badge, Tooltip, Group } from '@mantine/core';
import { IconLock, IconBox, IconTemplate } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Tag, InheritedTag } from '../../types/tag';

interface InheritedTagBadgeProps {
  /** The tag to display */
  tag: Tag;
  /** Inheritance information */
  inheritedFrom: InheritedTag;
  /** Size of the badge */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the lock icon */
  showLockIcon?: boolean;
}

export function InheritedTagBadge({
  tag,
  inheritedFrom,
  size = 'sm',
  showLockIcon = true,
}: InheritedTagBadgeProps) {
  const { t } = useTranslation(['tags']);

  // Determine the icon based on source type
  const SourceIcon = inheritedFrom.sourceType === 'kit' ? IconBox : IconTemplate;

  // Build tooltip message
  const tooltipMessage = t('tags:inheritedFrom', {
    sourceType: t(`tags:sourceType.${inheritedFrom.sourceType}`),
    sourceName: inheritedFrom.sourceName,
  });

  return (
    <Tooltip
      label={
        <Group gap="xs">
          <SourceIcon size={14} />
          {tooltipMessage}
        </Group>
      }
      position="top"
      withArrow
    >
      <Badge
        color={tag.color}
        variant="light"
        size={size}
        leftSection={
          showLockIcon ? (
            <Group gap={4}>
              <IconLock size={12} />
              <SourceIcon size={12} />
            </Group>
          ) : (
            <SourceIcon size={12} />
          )
        }
        style={{
          cursor: 'help',
          opacity: 0.8,
          borderStyle: 'dashed',
        }}
      >
        {tag.name}
      </Badge>
    </Tooltip>
  );
}

/**
 * Tag Badge with optional inheritance indicator
 * 
 * Shows either a regular tag badge or an inherited tag badge based on inheritance info
 */
interface TagBadgeWithInheritanceProps {
  /** The tag to display */
  tag: Tag;
  /** Optional inheritance information */
  inheritedFrom?: InheritedTag;
  /** Size of the badge */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether the tag can be removed (for non-inherited tags) */
  onRemove?: () => void;
  /** Whether removal is disabled */
  disabled?: boolean;
}

export function TagBadgeWithInheritance({
  tag,
  inheritedFrom,
  size = 'sm',
  onRemove,
  disabled = false,
}: TagBadgeWithInheritanceProps) {
  const { t } = useTranslation(['tags']);

  // If inherited, show inherited badge
  if (inheritedFrom) {
    return <InheritedTagBadge tag={tag} inheritedFrom={inheritedFrom} size={size} />;
  }

  // Otherwise, show regular removable badge
  return (
    <Tooltip
      label={onRemove && !disabled ? t('tags:clickToRemove') : undefined}
      disabled={!onRemove || disabled}
      position="top"
    >
      <Badge
        color={tag.color}
        variant="filled"
        size={size}
        style={{
          cursor: onRemove && !disabled ? 'pointer' : 'default',
        }}
        onClick={onRemove && !disabled ? onRemove : undefined}
      >
        {tag.name}
      </Badge>
    </Tooltip>
  );
}

/**
 * Tag List with Inheritance Indicators
 * 
 * Displays a list of tags, separating direct tags from inherited tags
 */
interface TagListWithInheritanceProps {
  /** Direct tags (not inherited) */
  directTags: Tag[];
  /** Inherited tags with source information */
  inheritedTags: Array<{ tag: Tag; inheritedFrom: InheritedTag }>;
  /** Callback when a direct tag is removed */
  onRemoveDirectTag?: (tagId: string) => void;
  /** Whether tag removal is disabled */
  disabled?: boolean;
  /** Size of the badges */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show section labels */
  showLabels?: boolean;
}

export function TagListWithInheritance({
  directTags,
  inheritedTags,
  onRemoveDirectTag,
  disabled = false,
  size = 'sm',
  showLabels = false,
}: TagListWithInheritanceProps) {
  const { t } = useTranslation(['tags']);

  if (directTags.length === 0 && inheritedTags.length === 0) {
    return null;
  }

  return (
    <Group gap="md">
      {/* Direct tags */}
      {directTags.length > 0 && (
        <Group gap="xs">
          {showLabels && (
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {t('tags:directTags')}:
            </span>
          )}
          {directTags.map((tag) => (
            <TagBadgeWithInheritance
              key={tag.id}
              tag={tag}
              size={size}
              onRemove={onRemoveDirectTag ? () => onRemoveDirectTag(tag.id) : undefined}
              disabled={disabled}
            />
          ))}
        </Group>
      )}

      {/* Inherited tags */}
      {inheritedTags.length > 0 && (
        <Group gap="xs">
          {showLabels && (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.8 }}>
              {t('tags:inheritedTags')}:
            </span>
          )}
          {inheritedTags.map(({ tag, inheritedFrom }) => (
            <InheritedTagBadge
              key={`${inheritedFrom.sourceType}-${inheritedFrom.sourceId}-${tag.id}`}
              tag={tag}
              inheritedFrom={inheritedFrom}
              size={size}
            />
          ))}
        </Group>
      )}
    </Group>
  );
}
