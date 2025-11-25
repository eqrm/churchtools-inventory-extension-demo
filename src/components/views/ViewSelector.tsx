import { SegmentedControl } from '@mantine/core';
import {
  IconTable,
  IconLayoutGrid,
  IconLayoutKanban,
  IconCalendar,
  IconList,
} from '@tabler/icons-react';
import type { ViewMode } from '../../types/entities';

export interface ViewSelectorProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

/**
 * Unified selector control for switching between asset list view modes
 * (table, gallery, kanban, calendar, list).
 */
export function ViewSelector({ value, onChange }: ViewSelectorProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={(val) => onChange(val as ViewMode)}
      data={[
        {
          value: 'table',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconTable size={16} />
              <span>Table</span>
            </div>
          ),
        },
        {
          value: 'gallery',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconLayoutGrid size={16} />
              <span>Gallery</span>
            </div>
          ),
        },
        {
          value: 'kanban',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconLayoutKanban size={16} />
              <span>Kanban</span>
            </div>
          ),
        },
        {
          value: 'calendar',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCalendar size={16} />
              <span>Calendar</span>
            </div>
          ),
        },
        {
          value: 'list',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconList size={16} />
              <span>List</span>
            </div>
          ),
        },
      ]}
    />
  );
}

// Backwards compatibility alias while older modules migrate
export const ViewModeSelector = ViewSelector;
