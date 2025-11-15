/**
 * AssetStatusMenu Component
 * 
 * Provides a clickable status badge with a dropdown menu for changing asset status,
 * assigning to someone, or marking as sold/broken.
 */

import { Badge, Menu } from '@mantine/core';
import { IconChevronDown, IconCheck, IconTool, IconUserPlus, IconX, IconTrash, IconCurrencyDollar, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import type { Asset, AssetStatus } from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';

interface AssetStatusMenuProps {
  asset: Asset;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onStatusChange: (newStatus: AssetStatus) => void;
  onAssignClick?: () => void;
  onBrokenClick?: () => void; // Callback when user wants to mark as broken (should open damage form)
  disabled?: boolean;
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

const STATUS_ICONS: Partial<Record<AssetStatus, React.ReactNode>> = {
  available: <IconCheck size={14} />,
  'in-use': <IconUserPlus size={14} />,
  broken: <IconX size={14} />,
  'in-repair': <IconTool size={14} />,
  installed: <IconSettings size={14} />,
  sold: <IconCurrencyDollar size={14} />,
  destroyed: <IconTrash size={14} />,
};

export function AssetStatusMenu({
  asset,
  size = 'sm',
  onStatusChange,
  onAssignClick,
  onBrokenClick,
  disabled = false,
}: AssetStatusMenuProps) {
  const [opened, setOpened] = useState(false);
  const config = STATUS_CONFIG[asset.status] || { color: 'gray', label: asset.status || 'Unknown' };

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      shadow="md"
      withinPortal
      disabled={disabled}
    >
      <Menu.Target>
        <Badge
          color={config.color}
          size={size}
          variant="filled"
          style={{ 
            cursor: disabled ? 'default' : 'pointer',
            userSelect: 'none',
          }}
          rightSection={!disabled && <IconChevronDown size={12} />}
        >
          {config.label}
        </Badge>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Change Status</Menu.Label>
        {ASSET_STATUS_OPTIONS.map((option) => {
          const isCurrentStatus = option.value === asset.status;
          const isBroken = option.value === 'broken';
          
          return (
            <Menu.Item
              key={option.value}
              leftSection={STATUS_ICONS[option.value]}
              onClick={() => {
                if (!isCurrentStatus) {
                  // If broken status is selected and we have a callback, open damage form first
                  if (isBroken && onBrokenClick) {
                    onBrokenClick();
                  } else {
                    onStatusChange(option.value);
                  }
                }
                setOpened(false);
              }}
              disabled={isCurrentStatus}
              style={{ opacity: isCurrentStatus ? 0.5 : 1 }}
            >
              {option.label}
              {isCurrentStatus && ' (current)'}
            </Menu.Item>
          );
        })}

        {onAssignClick && (
          <>
            <Menu.Divider />
            <Menu.Label>Quick Actions</Menu.Label>
            <Menu.Item
              leftSection={<IconUserPlus size={14} />}
              onClick={() => {
                onAssignClick();
                setOpened(false);
              }}
            >
              Assign to Someone
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
