import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { MaintenanceRuleTestModal } from '../../../components/maintenance/MaintenanceRuleTestModal';
import type { MaintenanceRule } from '../../../types/maintenance';
import type { ISODate, UUID } from '../../../types/entities';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars?.date) {
        return `${key} (${String(vars.date)})`;
      }
      return key;
    },
  }),
}));

describe('MaintenanceRuleTestModal', () => {
  const baseRule: MaintenanceRule = {
    id: 'rule-1' as UUID,
    name: 'Quarterly check',
    workType: 'inspection',
    isInternal: true,
    targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
    intervalType: 'months',
    intervalValue: 3,
    startDate: '2025-01-01',
    nextDueDate: '2025-04-01',
    leadTimeDays: 10,
    createdBy: 'user-1' as UUID,
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    rescheduleMode: 'actual-completion',
  };

  it('displays preview rows for the provided rule', () => {
    render(
      <MantineProvider>
        <MaintenanceRuleTestModal opened rule={baseRule} onClose={() => {}} />
      </MantineProvider>,
    );

    expect(screen.getByText('2025-04-01')).toBeInTheDocument();
  });

  it('renders empty state when preview cannot be generated', () => {
    render(
      <MantineProvider>
        <MaintenanceRuleTestModal
          opened
          rule={{
            ...baseRule,
            startDate: 'invalid-date' as ISODate,
            nextDueDate: 'invalid-date' as ISODate,
          }}
          onClose={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.getByText('maintenance:rules.previewEmptyState')).toBeInTheDocument();
  });
});
