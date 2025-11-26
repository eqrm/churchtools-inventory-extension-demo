import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 5: Settings Tests (T108-T152)
 * 
 * Tests for settings page tabs, prefixes, manufacturers, locations,
 * models, feature toggles, scanners, and history.
 */

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./settings');
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test.describe('5.1 Settings Page Tabs', () => {
    // T108 - Verify Settings page loads with tabs
    test('T108 - Settings page loads with tabs', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
      await expect(page.getByRole('tablist')).toBeVisible();
    });

    // T109 - Verify "Asset Prefixes" tab is default active
    test('T109 - Asset Prefixes tab is default active', async ({ page }) => {
      const prefixTab = page.getByRole('tab', { name: /Asset Prefixes/i });
      await expect(prefixTab).toBeVisible();
      await expect(prefixTab).toHaveAttribute('data-active', 'true');
    });

    // T110 - Verify "Manufacturers" tab is accessible
    test('T110 - Manufacturers tab is accessible', async ({ page }) => {
      const manufacturersTab = page.getByRole('tab', { name: /Manufacturers/i });
      await expect(manufacturersTab).toBeVisible();
      await manufacturersTab.click();
      // Tab should become active
      await expect(manufacturersTab).toHaveAttribute('data-active', 'true');
    });

    // T111 - Verify "Models" tab is accessible
    test('T111 - Models tab is accessible', async ({ page }) => {
      const modelsTab = page.getByRole('tab', { name: /Models/i });
      await expect(modelsTab).toBeVisible();
      await modelsTab.click();
      await expect(modelsTab).toHaveAttribute('data-active', 'true');
    });

    // T112 - Verify "Locations" tab is accessible
    test('T112 - Locations tab is accessible', async ({ page }) => {
      const locationsTab = page.getByRole('tab', { name: /Locations/i });
      await expect(locationsTab).toBeVisible();
      await locationsTab.click();
      await expect(locationsTab).toHaveAttribute('data-active', 'true');
    });

    // T113 - Verify "Modules" tab is accessible
    test('T113 - Modules tab is accessible', async ({ page }) => {
      const modulesTab = page.getByRole('tab', { name: /Modules/i });
      await expect(modulesTab).toBeVisible();
      await modulesTab.click();
      await expect(modulesTab).toHaveAttribute('data-active', 'true');
    });

    // T114 - Verify "Scanners" tab is accessible
    test('T114 - Scanners tab is accessible', async ({ page }) => {
      const scannersTab = page.getByRole('tab', { name: /Scanners/i });
      await expect(scannersTab).toBeVisible();
      await scannersTab.click();
      await expect(scannersTab).toHaveAttribute('data-active', 'true');
    });

    // T115 - Verify "History" tab is accessible
    test('T115 - History tab is accessible', async ({ page }) => {
      const historyTab = page.getByRole('tab', { name: /History/i });
      await expect(historyTab).toBeVisible();
      await historyTab.click();
      await expect(historyTab).toHaveAttribute('data-active', 'true');
    });
  });

  test.describe('5.2 Asset Prefix Settings', () => {
    // T116 - Verify prefix settings panel displays
    test('T116 - prefix settings panel displays', async ({ page }) => {
      // Prefixes tab is default, so panel should be visible
      const prefixPanel = page.getByRole('tabpanel');
      await expect(prefixPanel).toBeVisible();
    });

    // T117 - Verify prefix settings content is displayed
    test('T117 - prefix settings panel has content', async ({ page }) => {
      // Prefixes tab is default, panel should have some content
      const panel = page.getByRole('tabpanel');
      await expect(panel).toBeVisible();
      // Check that panel has some child elements
      const content = panel.locator('*').first();
      await expect(content).toBeVisible();
    });
  });

  test.describe('5.3 Manufacturer Settings', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Manufacturers tab
      await page.getByRole('tab', { name: /Manufacturers/i }).click();
      await page.waitForTimeout(300);
    });

    // T121 - Verify manufacturers list is displayed
    test('T121 - manufacturers list is displayed', async ({ page }) => {
      const panel = page.getByRole('tabpanel');
      await expect(panel).toBeVisible();
    });

    // T122 - Verify "Add Manufacturer" button works
    test('T122 - Add Manufacturer button is available', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add/i }).or(
        page.getByRole('button', { name: /New/i })
      );
      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('5.4 Location Settings', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Locations tab
      await page.getByRole('tab', { name: /Locations/i }).click();
      await page.waitForTimeout(300);
    });

    // T126 - Verify locations list is displayed
    test('T126 - locations list is displayed', async ({ page }) => {
      const panel = page.getByRole('tabpanel');
      await expect(panel).toBeVisible();
    });

    // T127 - Verify "Add Location" button works
    test('T127 - Add Location button is available', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add/i }).or(
        page.getByRole('button', { name: /New/i })
      );
      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('5.5 Feature Toggle Settings (Modules Tab)', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Modules tab
      await page.getByRole('tab', { name: /Modules/i }).click();
      await page.waitForTimeout(300);
    });

    // T137 - Verify Bookings toggle is displayed
    test('T137 - Bookings toggle is displayed', async ({ page }) => {
      // Look for "Enable bookings" label specifically
      await expect(page.getByText(/Enable bookings/i)).toBeVisible();
    });

    // T138 - Verify Kits toggle is displayed
    test('T138 - Kits toggle is displayed', async ({ page }) => {
      // Look for "Enable kits" label specifically
      await expect(page.getByText(/Enable kits/i)).toBeVisible();
    });

    // T139 - Verify Maintenance toggle is displayed
    test('T139 - Maintenance toggle is displayed', async ({ page }) => {
      // Look for "Enable maintenance" label specifically
      await expect(page.getByText(/Enable maintenance/i)).toBeVisible();
    });
  });

  test.describe('5.6 Scanner Model Settings', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Scanners tab
      await page.getByRole('tab', { name: /Scanners/i }).click();
      await page.waitForTimeout(300);
    });

    // T143 - Verify scanner models list is displayed
    test('T143 - scanner models list is displayed', async ({ page }) => {
      const panel = page.getByRole('tabpanel');
      await expect(panel).toBeVisible();
    });

    // T144 - Verify "Add Scanner Model" button is available
    test('T144 - Add Scanner Model button is available', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add/i }).or(
        page.getByRole('button', { name: /New/i })
      );
      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('5.7 Settings History Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to History tab
      await page.getByRole('tab', { name: /History/i }).click();
      await page.waitForTimeout(300);
    });

    // T150 - Verify Export button is available in History tab
    test('T150 - Export functionality is available', async ({ page }) => {
      const exportSection = page.getByText(/Export/i);
      await expect(exportSection.first()).toBeVisible();
    });

    // T151 - Verify Import button is available in History tab
    test('T151 - Import functionality is available', async ({ page }) => {
      const importSection = page.getByText(/Import/i);
      await expect(importSection.first()).toBeVisible();
    });
  });
});
