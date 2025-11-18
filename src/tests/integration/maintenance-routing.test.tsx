import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen, waitFor } from '../utils/custom-render';
import { MaintenancePage } from '../../pages/MaintenancePage';
import { useFeatureSettingsStore } from '../../stores';
import { initI18n } from '../../i18n/config';

describe('Maintenance routing integration', () => {
  beforeAll(async () => {
    // Ensure i18n is initialized
    await initI18n();
    // Enable maintenance feature
    useFeatureSettingsStore.getState().setModuleEnabled('maintenance', true);
  });

  test('navigating to /maintenance/dashboard renders nested route content via Outlet', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/maintenance',
          element: <MaintenancePage />,
          children: [
            {
              path: 'dashboard',
              element: <div data-testid="maintenance-child">child content</div>,
            },
          ],
        },
      ],
      { initialEntries: ['/maintenance/dashboard'] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      // The `div` child should be rendered inside the Outlet
      expect(screen.getByTestId('maintenance-child')).toHaveTextContent('child content');
    });
  });
});
