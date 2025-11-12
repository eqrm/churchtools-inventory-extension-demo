import { Badge } from '@mantine/core';
import type { AssetStatus } from '../../types/entities';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const STATUS_CONFIG: Record<AssetStatus, { color: string; label: string }> = {
  available: { color: 'green', label: 'Available' },
  'in-use': { color: 'blue', label: 'In Use' },
  broken: { color: 'red', label: 'Broken' },
  'in-maintenance': { color: 'yellow', label: 'In Maintenance' },
  retired: { color: 'gray', label: 'Retired' },
  disposed: { color: 'dark', label: 'Disposed' },
  'in-repair': { color: 'orange', label: 'In Repair' },
  installed: { color: 'grape', label: 'Installed' },
  sold: { color: 'gray', label: 'Sold' },
  destroyed: { color: 'dark', label: 'Destroyed' },
  deleted: { color: 'dark', label: 'Deleted' },
};

export function AssetStatusBadge({ status, size = 'sm' }: AssetStatusBadgeProps) {
  // Handle undefined, null, or invalid status values
  const config = STATUS_CONFIG[status] || { color: 'gray', label: status || 'Unknown' };
  
  return (
    <Badge color={config.color} size={size} variant="filled">
      {config.label}
    </Badge>
  );
}
