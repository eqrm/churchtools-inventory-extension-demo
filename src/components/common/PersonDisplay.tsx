/**
 * PersonDisplay Component
 * 
 * Displays a person's name with their avatar/icon.
 * Can be used inline or as a standalone component.
 * Fetches person data by ID if only ID is provided.
 */

import { useEffect, useState } from 'react';
import { Skeleton, Text } from '@mantine/core';
import { personSearchService, type PersonSearchResult } from '../../services/person/PersonSearchService';
import { PersonAvatar } from './PersonAvatar';

interface PersonDisplayProps {
  /** Person ID (will fetch data) */
  personId?: string;
  /** Pre-loaded person name (if ID not available or already fetched) */
  personName?: string;
  /** Pre-loaded person avatar URL */
  avatarUrl?: string;
  /** Size of the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Text size */
  textSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Text weight */
  textWeight?: number;
  /** Show only name without avatar */
  nameOnly?: boolean;
  /** Fallback text if no data available */
  fallback?: string;
}

export function PersonDisplay({
  personId,
  personName,
  avatarUrl,
  size = 'sm',
  textSize = 'sm',
  textWeight,
  nameOnly = false,
  fallback = '—',
}: PersonDisplayProps) {
  const [personData, setPersonData] = useState<PersonSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nameOnly || !personId || personName) {
      setPersonData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    personSearchService
      .getPersonById(personId)
      .then((person) => {
        if (!cancelled) {
          setPersonData(person);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load person data:', error);
          setPersonData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nameOnly, personId, personName]);

  const displayName = personName || personData?.displayName;

  if (nameOnly) {
    if (loading && !displayName) {
      return <Skeleton height={16} width={100} />;
    }

    return (
      <Text size={textSize} fw={textWeight} c={displayName ? undefined : 'dimmed'}>
        {displayName ?? fallback}
      </Text>
    );
  }

  return (
    <PersonAvatar
      personId={personId}
      name={personName ?? personData?.displayName}
      avatarUrl={avatarUrl ?? personData?.avatarUrl}
      size={size}
      textSize={textSize}
      textWeight={textWeight}
      fallbackLabel={fallback}
    />
  );
}
