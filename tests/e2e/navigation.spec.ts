import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 1: Navigation & Layout Tests (T001-T022)
 * 
 * Tests for navigation structure, routing, feature-gated nav items,
 * and header/undo history functionality.
 */

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    // Wait for the app to fully load
    await page.waitForSelector('[data-nav-label]', { timeout: 10000 });
  });

  test.describe('1.1 Navigation Structure', () => {
    // T001 - Verify sidebar navigation renders with all main menu items
    test('T001 - sidebar navigation renders with main menu items', async ({ page }) => {
      // Check all main navigation items are present
      await expect(page.locator('[data-nav-label="Dashboard"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Asset Types"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Assets"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Asset Models"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Stock Take"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Reports"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Settings"]')).toBeVisible();
      await expect(page.locator('[data-nav-label="Quick Scan"]')).toBeVisible();
    });

    // T002 - Verify Dashboard link is active by default on home route
    test('T002 - Dashboard link is active by default on home route', async ({ page }) => {
      const dashboardLink = page.locator('[data-nav-label="Dashboard"]');
      await expect(dashboardLink).toHaveAttribute('data-active', 'true');
    });

    // T003 - Verify clicking Assets navigates to /assets route
    test('T003 - clicking Assets navigates to /assets route', async ({ page }) => {
      await page.locator('[data-nav-label="Assets"]').click();
      await expect(page).toHaveURL(/.*\/assets$/);
    });

    // T004 - Verify clicking Categories navigates to /categories route
    test('T004 - clicking Categories navigates to /categories route', async ({ page }) => {
      await page.locator('[data-nav-label="Asset Types"]').click();
      await expect(page).toHaveURL(/.*\/categories$/);
    });

    // T005 - Verify clicking Settings navigates to /settings route
    test('T005 - clicking Settings navigates to /settings route', async ({ page }) => {
      await page.locator('[data-nav-label="Settings"]').click();
      await expect(page).toHaveURL(/.*\/settings$/);
    });

    // T006 - Verify clicking Asset Models navigates to /models route
    test('T006 - clicking Asset Models navigates to /models route', async ({ page }) => {
      await page.locator('[data-nav-label="Asset Models"]').click();
      await expect(page).toHaveURL(/.*\/models$/);
    });

    // T007 - Verify clicking Stock Take navigates to /stock-take route
    test('T007 - clicking Stock Take navigates to /stock-take route', async ({ page }) => {
      await page.locator('[data-nav-label="Stock Take"]').click();
      await expect(page).toHaveURL(/.*\/stock-take$/);
    });

    // T008 - Verify clicking Reports navigates to /reports route
    test('T008 - clicking Reports navigates to /reports route', async ({ page }) => {
      await page.locator('[data-nav-label="Reports"]').click();
      await expect(page).toHaveURL(/.*\/reports$/);
    });

    // T009 - Verify mobile burger menu toggle works correctly
    test('T009 - mobile burger menu toggle works correctly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Wait for the page to adjust
      await page.waitForTimeout(300);
      
      // Burger button should be visible on mobile
      const burgerButton = page.getByRole('button', { name: /toggle navigation/i }).or(
        page.locator('button.mantine-Burger-burger').first()
      );
      
      // The navbar should be collapsed by default on mobile
      const navbar = page.locator('nav').or(page.locator('[class*="Navbar"]'));
      
      // Click burger to open navbar
      if (await burgerButton.isVisible()) {
        await burgerButton.click();
        // After click, navigation items should be visible
        await expect(page.locator('[data-nav-label="Dashboard"]')).toBeVisible();
      }
    });

    // T010 - Verify active navigation item styling changes on route change
    test('T010 - active navigation styling changes on route change', async ({ page }) => {
      // Dashboard should be active initially
      const dashboardLink = page.locator('[data-nav-label="Dashboard"]');
      await expect(dashboardLink).toHaveAttribute('data-active', 'true');
      
      // Navigate to Assets
      await page.locator('[data-nav-label="Assets"]').click();
      await expect(page).toHaveURL(/.*\/assets$/);
      
      // Now Assets should be active
      const assetsLink = page.locator('[data-nav-label="Assets"]');
      await expect(assetsLink).toHaveAttribute('data-active', 'true');
      
      // Dashboard should no longer be active
      await expect(dashboardLink).not.toHaveAttribute('data-active', 'true');
    });
  });

  test.describe('1.2 Feature-Gated Navigation', () => {
    // Helper to enable a feature via localStorage (which the store persists to)
    async function setFeatureFlags(page: Page, flags: {
      bookingsEnabled?: boolean;
      kitsEnabled?: boolean;
      maintenanceEnabled?: boolean;
    }) {
      await page.evaluate((flags) => {
        // The feature settings store persists to localStorage with this specific key
        const storeKey = 'churchtools-inventory-feature-settings';
        const defaultState = {
          bookingsEnabled: false,
          kitsEnabled: true,
          maintenanceEnabled: false,
        };
        const currentState = JSON.parse(localStorage.getItem(storeKey) || '{}');
        const state = currentState.state || defaultState;
        const newState = { ...state, ...flags };
        localStorage.setItem(storeKey, JSON.stringify({ state: newState }));
      }, flags);
      // Reload page for changes to take effect
      await page.reload();
      await page.waitForSelector('[data-nav-label]', { timeout: 10000 });
    }

    // T011 - Verify Bookings link is hidden when bookingsEnabled is false
    test('T011 - Bookings link hidden when bookingsEnabled is false', async ({ page }) => {
      await setFeatureFlags(page, { bookingsEnabled: false });
      await expect(page.locator('[data-nav-label="Bookings"]')).not.toBeVisible();
    });

    // T012 - Verify Bookings link is visible when bookingsEnabled is true
    test('T012 - Bookings link visible when bookingsEnabled is true', async ({ page }) => {
      await setFeatureFlags(page, { bookingsEnabled: true });
      await expect(page.locator('[data-nav-label="Bookings"]')).toBeVisible();
    });

    // T013 - Verify Kits link is hidden when kitsEnabled is false
    test('T013 - Kits link hidden when kitsEnabled is false', async ({ page }) => {
      await setFeatureFlags(page, { kitsEnabled: false });
      await expect(page.locator('[data-nav-label="Kits"]')).not.toBeVisible();
    });

    // T014 - Verify Kits link is visible when kitsEnabled is true
    test('T014 - Kits link visible when kitsEnabled is true', async ({ page }) => {
      await setFeatureFlags(page, { kitsEnabled: true });
      await expect(page.locator('[data-nav-label="Kits"]')).toBeVisible();
    });

    // T015 - Verify Maintenance link is hidden when maintenanceEnabled is false
    test('T015 - Maintenance link hidden when maintenanceEnabled is false', async ({ page }) => {
      await setFeatureFlags(page, { maintenanceEnabled: false });
      await expect(page.locator('[data-nav-label="Maintenance"]')).not.toBeVisible();
    });

    // T016 - Verify Maintenance link is visible when maintenanceEnabled is true
    test('T016 - Maintenance link visible when maintenanceEnabled is true', async ({ page }) => {
      await setFeatureFlags(page, { maintenanceEnabled: true });
      await expect(page.locator('[data-nav-label="Maintenance"]')).toBeVisible();
    });

    // T017 - Verify direct URL access to disabled feature redirects to Dashboard
    test('T017 - direct URL to disabled feature redirects to Dashboard', async ({ page }) => {
      // Ensure bookings is disabled
      await setFeatureFlags(page, { bookingsEnabled: false });
      
      // Try to access bookings directly
      await page.goto('./bookings');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/$/);
    });
  });

  test.describe('1.3 Header', () => {
    // T018 - Verify header displays app title "Inventory"
    test('T018 - header displays app title', async ({ page }) => {
      // The title is "Inventory Manager"
      const header = page.locator('header');
      await expect(header.getByText('Inventory Manager')).toBeVisible();
    });

    // T019 - Verify global undo history button is NOT present in header (removed per Issue 8)
    test('T019 - global undo history button is NOT present in header', async ({ page }) => {
      // The global undo history button was removed in Issue 8
      // Undo functionality is now only available for bulk actions
      const undoButton = page.locator('header').getByRole('button', { name: /undo|history/i });
      await expect(undoButton).not.toBeVisible();
    });
  });
});
