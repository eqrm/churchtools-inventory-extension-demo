import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MaintenanceRuleForm } from '../../../components/maintenance/MaintenanceRuleForm';
import type { MaintenanceRule } from '../../../types/maintenance';
import type { UUID } from '../../../types/entities';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars?.label) {
        return `${key} (${String(vars.label)})`;
      }
      return key;
    },
  }),
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView =
    window.HTMLElement.prototype.scrollIntoView || (() => {});
});

describe('MaintenanceRuleForm', () => {
  const baseRule: MaintenanceRule = {
    id: 'rule-1' as UUID,
    name: 'Quarterly check',
    workType: 'maintenance',
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

  it('preselects model targets when editing a model rule', () => {
    render(
      <MantineProvider>
        <MaintenanceRuleForm
          rule={{
            ...baseRule,
            targets: [{ type: 'model', ids: ['model-1' as UUID] }],
          }}
          companies={[]}
          assets={[]}
          kits={[]}
          models={[{ id: 'model-1' as UUID, name: 'Generator Model' }]}
          tags={[]}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      </MantineProvider>,
    );

    const selectedModelLabels = screen.getAllByText('Generator Model');
    expect(selectedModelLabels.length).toBeGreaterThan(0);
  });

  it('requires custom work type label and submits full payload', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <MaintenanceRuleForm
          companies={[{ id: 'company-1' as UUID, name: 'Acme Services' }]}
          assets={[{ id: 'asset-1' as UUID, name: 'Stage Light' }]}
          kits={[]}
          models={[]}
          tags={[]}
          onSubmit={handleSubmit}
          onCancel={vi.fn()}
        />
      </MantineProvider>,
    );

    const nameField = screen.getByLabelText(/maintenance:fields\.ruleName/);
    await user.type(nameField, ' Filter swap ');

    await user.click(screen.getByPlaceholderText('maintenance:placeholders.workType'));
    await user.click(screen.getByText('maintenance:workTypes.custom'));

    await user.click(screen.getByRole('button', { name: 'common:actions.create' }));
    expect(handleSubmit).not.toHaveBeenCalled();

    const customLabelField = screen.getByPlaceholderText(
      'maintenance:placeholders.customWorkType',
    );
    await user.type(customLabelField, ' Filter swap ');

    await user.click(screen.getByRole('radio', { name: 'maintenance:types.external' }));

    await user.click(screen.getByPlaceholderText('maintenance:placeholders.serviceProvider'));
    await user.click(screen.getByText('Acme Services'));

    const targetInput = screen.getByPlaceholderText('maintenance:placeholders.selectTargets');
    await user.click(targetInput);
    await user.type(targetInput, 'Stage');
    await user.click(await screen.findByText('Stage Light'));

    await user.click(
      screen.getByRole('radio', { name: 'maintenance:rescheduleModes.replanOnce' }),
    );

    await user.click(screen.getByRole('button', { name: 'common:actions.create' }));

    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: ' Filter swap ',
          workType: 'custom',
          workTypeCustomLabel: 'Filter swap',
          isInternal: false,
          serviceProviderId: 'company-1',
          targets: [{ type: 'asset', ids: ['asset-1'] }],
          rescheduleMode: 'replan-once',
          startDate: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
        }),
      ),
    );
  });
});
