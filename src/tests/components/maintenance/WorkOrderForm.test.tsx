import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { WorkOrderForm } from '../../../components/maintenance/WorkOrderForm';
import type { UUID } from '../../../types/entities';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WorkOrderForm', () => {
  it('submits selected assets and order type', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <WorkOrderForm
          type="internal"
          assets={[
            { id: 'asset-1' as UUID, name: 'Boom Lift', assetNumber: 'AS-100' },
            { id: 'asset-2' as UUID, name: 'Stage Deck', assetNumber: 'AS-200' },
          ]}
          companies={[]}
          rules={[]}
          onSubmit={handleSubmit}
          onCancel={vi.fn()}
        />
      </MantineProvider>,
    );

    const assetPicker = screen.getByPlaceholderText('maintenance:placeholders.targets');
    await user.click(assetPicker);
    await user.type(assetPicker, 'Boom');
    await user.click(await screen.findByText('Boom Lift (AS-100)'));

    await user.click(screen.getByRole('radio', { name: 'maintenance:orderTypes.follow-up' }));

    await user.click(screen.getByRole('button', { name: 'common:actions.create' }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'follow-up',
        lineItems: [
          expect.objectContaining({ assetId: 'asset-1', completionStatus: 'pending' }),
        ],
      }),
    );
  });
});
