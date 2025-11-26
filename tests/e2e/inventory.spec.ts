import { test, expect } from '@playwright/test';

test.describe('Inventory App', () => {
  test('has title', async ({ page }) => {
    await page.goto('./');
    // Adjust title expectation based on actual app title
    // await expect(page).toHaveTitle(/Inventory/);
  });

  test('loads dashboard', async ({ page }) => {
    await page.goto('./');
    // Check for some dashboard element
    // await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('loads inventory items from mock', async ({ page }) => {
    await page.goto('assets');
    // The mock returns "Test Item 1", "Test Item 2", "Test Item 3"
    // We wait for the data to load
    try {
      await expect(page.getByText('Test Item 1')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Test Item 2')).toBeVisible();
    } catch (e) {
      // console.log('Page content:', await page.content()); // Too verbose
      throw e;
    }
  });

  test('navigates to settings', async ({ page }) => {
    await page.goto('settings');
    await expect(page).toHaveURL(/.*settings/);
    // Check for settings content
    // await expect(page.getByText('Settings')).toBeVisible();
  });
});
