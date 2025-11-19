import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../tests/utils/custom-render';
import { MaintenanceCompanies } from '../MaintenanceCompanies';
import type { MaintenanceCompany } from '../../types/maintenance';

const mockCompany: MaintenanceCompany = {
  id: 'company-1',
  name: 'Audio Pros',
  contactPerson: 'Jane Doe',
  address: '123 Service Way',
  serviceLevelAgreement: 'Standard',
  hourlyRate: 120,
  contractNotes: 'Handles emergency callouts',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  createdBy: 'user-1',
  createdByName: 'User One',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'maintenance:companies.title': 'Maintenance Companies',
        'maintenance:companies.addNew': 'Add Company',
        'maintenance:companies.noCompanies': 'No Companies',
        'maintenance:companies.editCompany': 'Edit Company',
        'maintenance:companies.deleteCompany': 'Delete Company',
        'maintenance:companies.deleteConfirm': 'Delete Confirmation',
        'maintenance:fields.name': 'Name',
        'maintenance:fields.contactPerson': 'Contact',
        'maintenance:fields.address': 'Address',
        'maintenance:fields.hourlyRate': 'Hourly rate',
        'maintenance:fields.appliesTo': 'Applies to',
        'common:columns.actions': 'Actions Column',
        'common:loading': 'Loading',
        'common:cancel': 'Cancel',
        'common:delete': 'Delete',
      };
      return map[key] ?? key;
    },
  }),
}));

const mutateStub = vi.fn();

vi.mock('../../hooks/useMaintenance', () => ({
  useMaintenanceCompanies: () => ({ data: [mockCompany], isLoading: false }),
  useDeleteMaintenanceCompany: () => ({ mutateAsync: mutateStub, isPending: false }),
  useCreateMaintenanceCompany: () => ({ mutateAsync: mutateStub, isPending: false }),
  useUpdateMaintenanceCompany: () => ({ mutateAsync: mutateStub, isPending: false }),
}));

vi.mock('../../components/maintenance/MaintenanceCompanyForm', () => ({
  MaintenanceCompanyForm: () => <div data-testid="maintenance-company-form" />,
}));

describe('MaintenanceCompanies page', () => {
  it('shows the translated actions column header', () => {
    render(<MaintenanceCompanies />);

    expect(
      screen.getByRole('columnheader', { name: 'Actions Column' })
    ).toBeInTheDocument();
  });
});
