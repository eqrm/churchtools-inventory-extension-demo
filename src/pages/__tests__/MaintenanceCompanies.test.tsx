import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../tests/utils/custom-render';
import { MaintenanceCompanies } from '../MaintenanceCompanies';
import type { MaintenanceCompany } from '../../types/maintenance';

const mockCompany: MaintenanceCompany = {
  id: 'company-1',
  name: 'Audio Pros',
  contactPerson: 'Jane Doe',
  contactEmail: 'jane@audiopros.com',
  contactPhone: '123-456-7890',
  address: '123 Service Way',
  serviceLevelAgreement: 'Standard',
  hourlyRate: 120,
  contractNotes: 'Handles emergency callouts',
  createdAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'user-1',
  createdByName: 'User One',
  lastModifiedAt: '2024-01-02T00:00:00.000Z',
  lastModifiedBy: 'user-1',
  lastModifiedByName: 'User One',
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
        'maintenance:fields.contactEmail': 'Email',
        'maintenance:fields.contactPhone': 'Phone',
        'maintenance:fields.hourlyRate': 'Hourly rate',
        'maintenance:companies.actionsColumn': 'Actions',
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
  it('renders the company list with correct headers', () => {
    render(<MaintenanceCompanies />);

    expect(screen.getByText('Maintenance Companies')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByText('Audio Pros')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@audiopros.com')).toBeInTheDocument();
  });

  it('opens the create modal when Add Company is clicked', async () => {
    render(<MaintenanceCompanies />);
    
    const addButton = screen.getByRole('button', { name: 'Add Company' });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-company-form')).toBeInTheDocument();
    });
  });
});
