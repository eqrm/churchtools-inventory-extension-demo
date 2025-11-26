/**
 * Phase 11: Maintenance E2E Tests
 * Test IDs: T253-T261
 * 
 * Tests for Maintenance hub page and sub-pages (Dashboard, Companies, Rules, Work Orders).
 */
import { test, expect, type Page } from '@playwright/test';

// Base URL for the app
const BASE_URL = '/ccm/testfkoinventorymanagement';

// Helper function to enable feature flags via localStorage
async function enableAllFeatures(page: Page) {
  await page.addInitScript(() => {
    const featureSettings = {
      state: {
        bookingsEnabled: true,
        kitsEnabled: true,
        maintenanceEnabled: true,
      },
      version: 0,
    };
    localStorage.setItem('churchtools-inventory-feature-settings', JSON.stringify(featureSettings));
  });
}

test.describe('Phase 11: Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatures(page);
    await page.goto(`${BASE_URL}/maintenance`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('11.1 Maintenance Hub Page', () => {
    // T253 - Verify Maintenance page loads
    test('T253 - Maintenance page loads successfully', async ({ page }) => {
      await expect(page).toHaveURL(/\/maintenance\/?/);
      const content = page.locator('main, .mantine-Stack-root').first();
      await expect(content).toBeVisible();
    });

    // T254 - Verify page has title
    test('T254 - Maintenance page has title', async ({ page }) => {
      const title = page.getByRole('heading', { level: 1 });
      await expect(title).toBeVisible();
    });

    // T255 - Verify quick links are available (Dashboard, Companies, Rules, Work Orders)
    test('T255 - Quick links section is available', async ({ page }) => {
      // Maintenance hub has quick link cards
      const quickLinkCard = page.locator('[data-testid^="maintenance-quick-link-"]').first();
      await expect(quickLinkCard).toBeVisible();
    });
  });

  test.describe('11.2 Maintenance Navigation', () => {
    // T256 - Verify Maintenance is accessible from navigation
    test('T256 - Maintenance accessible from navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-nav-label="Maintenance"]').or(
        page.getByRole('link', { name: /Maintenance|Wartung/i })
      );
      await navLink.first().click();

      await expect(page).toHaveURL(/\/maintenance/);
    });

    // T257 - Verify Maintenance navigation item is visible
    test('T257 - Maintenance navigation item is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-nav-label="Maintenance"]').or(
        page.getByText(/Maintenance|Wartung/i)
      );
      await expect(navLink.first()).toBeVisible();
    });
  });

  test.describe('11.3 Maintenance Dashboard', () => {
    // T258 - Verify overview card is displayed
    test('T258 - Maintenance overview card is displayed', async ({ page }) => {
      const overviewCard = page.locator('[data-testid="maintenance-overview-card"]');
      await expect(overviewCard).toBeVisible();
    });

    // T259 - Verify dashboard link is available
    test('T259 - Dashboard link is available', async ({ page }) => {
      const dashboardLink = page.locator('[data-testid="maintenance-quick-link-overview"]').or(
        page.getByRole('link', { name: /Dashboard|Overview/i })
      );
      await expect(dashboardLink.first()).toBeVisible();
    });
  });

  test.describe('11.4 Work Orders Sub-page', () => {
    // T260 - Verify work orders quick link exists
    test('T260 - Work orders quick link exists', async ({ page }) => {
      const workOrdersLink = page.locator('[data-testid="maintenance-quick-link-workOrders"]');
      await expect(workOrdersLink).toBeVisible();
    });

    // T261 - Verify work orders page can be accessed
    test('T261 - Work orders page can be accessed', async ({ page }) => {
      // Click on work orders quick link button
      const workOrdersCard = page.locator('[data-testid="maintenance-quick-link-workOrders"]');
      const linkButton = workOrdersCard.getByRole('link').or(workOrdersCard.getByRole('button'));
      await linkButton.first().click();
      
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/maintenance\/work-orders/);
    });
  });
});
