import { useMemo } from 'react';
import { IconCheck, IconMapPin, IconTag, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { BulkAction } from '../components/assets/BulkActionBar';

/**
 * Hook to generate default bulk actions for asset list
 */
export function useDefaultBulkActions(options: {
  onStatusChange: () => void;
  onLocationChange: () => void;
  onTagChange: () => void;
  onDelete: () => void;
  disabled?: boolean;
}): BulkAction[] {
  const { t } = useTranslation('assets');
  
  return useMemo(() => [
    {
      id: 'status',
      label: t('bulkActions.changeStatus'),
      icon: <IconCheck size={14} />,
      onClick: options.onStatusChange,
      disabled: options.disabled,
    },
    {
      id: 'location',
      label: t('bulkActions.changeLocation'),
      icon: <IconMapPin size={14} />,
      onClick: options.onLocationChange,
      disabled: options.disabled,
    },
    {
      id: 'tags',
      label: t('bulkActions.manageTags'),
      icon: <IconTag size={14} />,
      onClick: options.onTagChange,
      disabled: options.disabled,
    },
    {
      id: 'delete',
      label: t('bulkActions.delete'),
      icon: <IconTrash size={14} />,
      onClick: options.onDelete,
      color: 'red',
      disabled: options.disabled,
    },
  ], [t, options.onStatusChange, options.onLocationChange, options.onTagChange, options.onDelete, options.disabled]);
}
