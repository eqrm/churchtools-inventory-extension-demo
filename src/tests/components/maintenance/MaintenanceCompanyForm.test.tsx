import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { MaintenanceCompanyForm } from '../../../components/maintenance/MaintenanceCompanyForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MaintenanceCompanyForm', () => {
  it('submits trimmed optional fields and required values', async () => {
    const handleSubmit = vi.fn();
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <MaintenanceCompanyForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </MantineProvider>,
    );

    const byLabel = (label: string) =>
      screen.getByLabelText((content) => content.startsWith(label));

    await user.type(byLabel('maintenance:fields.companyName'), '  Beacon Services  ');
    await user.type(byLabel('maintenance:fields.contactPerson'), '  Alex   Stone  ');
    await user.type(byLabel('maintenance:fields.contactEmail'), '  ops@beacon.io  ');
    await user.type(byLabel('maintenance:fields.contactPhone'), '  +1 555 1234  ');
    await user.type(byLabel('maintenance:fields.address'), ' 123 Service Rd ');
    await user.type(byLabel('maintenance:fields.serviceLevelAgreement'), ' 24h response ');
    await user.clear(byLabel('maintenance:fields.hourlyRate'));
    await user.type(byLabel('maintenance:fields.hourlyRate'), '85.5');
    await user.type(byLabel('maintenance:fields.contractNotes'), ' Includes spares ');

    await user.click(screen.getByRole('button', { name: 'common:actions.create' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Beacon Services',
      contactPerson: 'Alex   Stone',
      contactEmail: 'ops@beacon.io',
      contactPhone: '+1 555 1234',
      address: '123 Service Rd',
      serviceLevelAgreement: '24h response',
      hourlyRate: 85.5,
      contractNotes: 'Includes spares',
    });
  });

  it('validates email and phone formats', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <MaintenanceCompanyForm onSubmit={handleSubmit} onCancel={() => undefined} />
      </MantineProvider>,
    );

    const byLabel = (label: string) =>
      screen.getByLabelText((content) => content.startsWith(label));

    await user.type(byLabel('maintenance:fields.companyName'), 'Northwind');
    await user.type(byLabel('maintenance:fields.address'), '742 Evergreen Terrace');
    await user.type(byLabel('maintenance:fields.serviceLevelAgreement'), 'Next-day response');
    await user.type(byLabel('maintenance:fields.contactEmail'), 'bad-email');
    await user.type(byLabel('maintenance:fields.contactPhone'), '12');

    await user.click(screen.getByRole('button', { name: 'common:actions.create' }));

    expect(screen.getByText('maintenance:validation.contactEmailInvalid')).toBeInTheDocument();
    expect(screen.getByText('maintenance:validation.contactPhoneInvalid')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
