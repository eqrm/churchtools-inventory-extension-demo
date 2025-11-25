import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '../utils/custom-render';
import type { MaintenanceCompany } from '../../types/maintenance';
import { MaintenanceCompanies } from '../../pages/MaintenanceCompanies';

const mockUseMaintenanceCompanies = vi.fn();
const mockUseDeleteMaintenanceCompany = vi.fn();
const mockUseCreateMaintenanceCompany = vi.fn();
const mockUseUpdateMaintenanceCompany = vi.fn();

vi.mock('../../hooks/useMaintenance', () => ({
  useMaintenanceCompanies: (...args: unknown[]) => mockUseMaintenanceCompanies(...args),
  useDeleteMaintenanceCompany: (...args: unknown[]) => mockUseDeleteMaintenanceCompany(...args),
  useCreateMaintenanceCompany: (...args: unknown[]) => mockUseCreateMaintenanceCompany(...args),
  useUpdateMaintenanceCompany: (...args: unknown[]) => mockUseUpdateMaintenanceCompany(...args),
}));

const translations: Record<string, string> = {
  'maintenance:companies.title': 'Maintenance Companies',
  'maintenance:companies.addNew': 'Add Company',
  'maintenance:companies.noCompanies': 'No maintenance companies yet',
  'maintenance:companies.actionsColumn': 'Actions',
  'maintenance:companies.unknownContact': 'No contact assigned',
  'maintenance:companies.noEmail': 'No email provided',
  'maintenance:companies.noPhone': 'No phone provided',
  'maintenance:fields.name': 'Name',
  'maintenance:fields.contactPerson': 'Contact',
  'maintenance:fields.address': 'Address',
  'maintenance:fields.contactEmail': 'Email',
  'maintenance:fields.contactPhone': 'Phone',
  'maintenance:fields.hourlyRate': 'Hourly Rate',
  'common:loading': 'Loading…',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe('MaintenanceCompanies page', () => {
  const baseCompany: MaintenanceCompany = {
    id: 'company-1',
    name: 'Northwind',
    contactPerson: 'Alice',
    contactEmail: 'service@northwind.test',
    contactPhone: '+49 30 0000',
    address: '42 Industrial Way',
    serviceLevelAgreement: 'Next-day responses',
    hourlyRate: 75,
    contractNotes: 'Includes parts',
    createdBy: 'user-1',
    createdByName: 'User One',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    mockUseMaintenanceCompanies.mockReturnValue({ data: [baseCompany], isLoading: false });
    mockUseDeleteMaintenanceCompany.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseCreateMaintenanceCompany.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateMaintenanceCompany.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders the actions column header using the translated label', () => {
    render(<MaintenanceCompanies />);

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows fallback text when contact information is missing', () => {
    mockUseMaintenanceCompanies.mockReturnValue({
      data: [
        baseCompany,
        {
          ...baseCompany,
          id: 'company-2',
          name: 'Fallback Ltd.',
          contactPerson: undefined,
          contactEmail: undefined,
          contactPhone: undefined,
        },
      ],
      isLoading: false,
    });

    render(<MaintenanceCompanies />);

    expect(screen.getByText('No contact assigned')).toBeInTheDocument();
    expect(screen.getByText('No email provided')).toBeInTheDocument();
    expect(screen.getByText('No phone provided')).toBeInTheDocument();
  });
});
