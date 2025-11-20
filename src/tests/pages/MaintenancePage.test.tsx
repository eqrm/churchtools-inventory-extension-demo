import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '../utils/custom-render';
import { MaintenancePage } from '../../pages/MaintenancePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && 'label' in params) {
        return `${key}(${params.label})`;
      }
      return key;
    },
  }),
}));

describe('MaintenancePage', () => {
  function renderWithRouter(initialEntry: string) {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/maintenance/*" element={<MaintenancePage />}>
            <Route path="dashboard" element={<div data-testid="maintenance-child">child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows only the four quick-link workspaces on the root route', () => {
    renderWithRouter('/maintenance');

    const quickLinks = screen.getAllByTestId(/maintenance-quick-link-/i);
    expect(quickLinks).toHaveLength(4);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('renders outlet content for nested maintenance routes', () => {
    renderWithRouter('/maintenance/dashboard');

    expect(screen.getByTestId('maintenance-child')).toHaveTextContent('child content');
  });
});
