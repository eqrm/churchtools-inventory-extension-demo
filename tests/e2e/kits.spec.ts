/**
 * Phase 10: Kits E2E Tests
 * Test IDs: T232-T252
 * 
 * Tests for Kits management - grouped asset collections.
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

test.describe('Phase 10: Kits', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatures(page);
    await page.goto(`${BASE_URL}/kits`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('10.1 Kits Page', () => {
    // T232 - Verify Kits page loads
    test('T232 - Kits page loads successfully', async ({ page }) => {
      await expect(page).toHaveURL(/\/kits\/?/);
      // Should have content visible
      const content = page.locator('main, .mantine-Stack-root').first();
      await expect(content).toBeVisible();
    });

    // T233 - Verify page has title
    test('T233 - Kits page has title', async ({ page }) => {
      const title = page.getByRole('heading', { name: /Kit/i });
      await expect(title.first()).toBeVisible();
    });

    // T234 - Verify create button is available
    test('T234 - Create kit button is available', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /New|Create|Add|Neu/i });
      await expect(createButton.first()).toBeVisible();
    });
  });

  test.describe('10.2 Kit Navigation', () => {
    // T235 - Verify Kits is accessible from navigation
    test('T235 - Kits accessible from navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-nav-label="Kits"]').or(
        page.getByRole('link', { name: /Kits/i })
      );
      await navLink.first().click();

      await expect(page).toHaveURL(/\/kits/);
    });

    // T236 - Verify Kits navigation item is visible
    test('T236 - Kits navigation item is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-nav-label="Kits"]').or(
        page.getByText(/Kits/i)
      );
      await expect(navLink.first()).toBeVisible();
    });
  });

  test.describe('10.3 Kit List', () => {
    // T237 - Verify kit list area is displayed
    test('T237 - Kit list area is displayed', async ({ page }) => {
      const listArea = page.locator('.mantine-DataTable-root, .mantine-Card-root, .mantine-Stack-root').first();
      await expect(listArea).toBeVisible();
    });

    // T238 - Verify search is available
    test('T238 - Search is available', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Search/i);
      await expect(searchInput.first()).toBeVisible();
    });
  });

  test.describe('10.4 Create Kit Modal', () => {
    test.beforeEach(async ({ page }) => {
      const createButton = page.getByRole('button', { name: /New|Create|Add|Neu/i });
      await createButton.first().click();
      await page.waitForTimeout(300);
    });

    // T239 - Verify create modal opens
    test('T239 - Create kit modal opens', async ({ page }) => {
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
    });

    // T240 - Verify form has name field
    test('T240 - Form has name field', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const nameField = modal.getByLabel(/Name/i).or(
        modal.getByPlaceholder(/Name/i)
      );
      await expect(nameField.first()).toBeVisible();
    });
  });
});
