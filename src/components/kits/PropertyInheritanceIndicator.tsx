import { useEffect, useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { KitInheritanceProperty } from '../../types/entities';
import { usePropertyInheritance } from '../../hooks/usePropertyInheritance';
import { useTranslation } from 'react-i18next';

interface PropertyInheritanceIndicatorProps {
  assetId: string;
  property: KitInheritanceProperty;
}

export function PropertyInheritanceIndicator({ assetId, property }: PropertyInheritanceIndicatorProps) {
  const { t } = useTranslation('kits');
  const { ready, isPropertyInherited } = usePropertyInheritance();
  const [inherited, setInherited] = useState(false);
  const [source, setSource] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!ready || !assetId) {
      setInherited(false);
      setSource(undefined);
      return;
    }

    let cancelled = false;
    void isPropertyInherited(assetId, property)
      .then((result) => {
        if (!cancelled) {
          setInherited(result.inherited);
          setSource(result.source);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInherited(false);
          setSource(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetId, property, ready, isPropertyInherited]);

  if (!inherited) {
    return null;
  }

  const tooltipKey = source ? 'inheritance.tooltipWithSource' : 'inheritance.tooltipGeneric';
  const tooltipLabel = source ? t(tooltipKey, { source }) : t(tooltipKey);

  return (
    <Tooltip label={tooltipLabel} withArrow>
      <ActionIcon size="sm" variant="subtle" color="blue" aria-label={tooltipLabel}>
        <IconLock size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
