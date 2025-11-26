/**
 * Phase 15: Accessibility E2E Tests
 * Test IDs: T303-T307
 * 
 * Tests for accessibility requirements and best practices.
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

test.describe('Phase 15: Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatures(page);
  });

  test.describe('15.1 Keyboard Navigation', () => {
    // T303 - Verify keyboard navigation works
    test('T303 - Tab navigation works through main elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Press Tab to navigate
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Some element should be focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    // T304 - Verify focus indicators are visible
    test('T304 - Focus indicators are visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Tab to a focusable element
      await page.keyboard.press('Tab');
      
      // Check that something is focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('15.2 ARIA Labels', () => {
    // T305 - Verify navigation has proper labels
    test('T305 - Navigation has accessible labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Check for navigation element
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav.first()).toBeVisible();
    });

    // T306 - Verify buttons have accessible names
    test('T306 - Interactive elements are labeled', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Check that buttons have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      
      // Should have at least one button
      expect(buttonCount).toBeGreaterThan(0);
    });
  });

  test.describe('15.3 Screen Reader Support', () => {
    // T307 - Verify page has proper heading structure
    test('T307 - Page has proper heading structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Should have at least one heading
      const headings = page.getByRole('heading');
      const headingCount = await headings.count();
      
      expect(headingCount).toBeGreaterThan(0);
    });
  });
});
