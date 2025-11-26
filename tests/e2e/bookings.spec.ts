/**
 * Phase 9: Bookings E2E Tests
 * Test IDs: T206-T231
 * 
 * Tests for Bookings feature - asset reservation system.
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

test.describe('Phase 9: Bookings', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatures(page);
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('9.1 Bookings Page', () => {
    // T206 - Verify Bookings page loads
    test('T206 - Bookings page loads successfully', async ({ page }) => {
      await expect(page).toHaveURL(/\/bookings\/?/);
      // Should have content visible
      const content = page.locator('main, .mantine-Stack-root').first();
      await expect(content).toBeVisible();
    });

    // T207 - Verify New Booking button is visible
    test('T207 - New Booking button is visible', async ({ page }) => {
      // Button text might be "Neue Buchung" (German) or "Create First Booking"
      const newButton = page.getByRole('button', { name: /Neue Buchung|Create.*Booking/i });
      await expect(newButton.first()).toBeVisible();
    });

    // T208 - Verify booking list area is displayed
    test('T208 - Booking list area is displayed', async ({ page }) => {
      // Should show list or empty state
      const listArea = page.locator('.mantine-DataTable-root, .mantine-Card-root, .mantine-Stack-root').first();
      await expect(listArea).toBeVisible();
    });

    // T209 - Verify search input is available
    test('T209 - Search input is available', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Search/i).or(
        page.locator('input[type="search"]')
      );
      await expect(searchInput.first()).toBeVisible();
    });
  });

  test.describe('9.2 Create Booking Modal', () => {
    test.beforeEach(async ({ page }) => {
      // Click create button - button text might be "Neue Buchung" (German) or "Create First Booking"
      const newButton = page.getByRole('button', { name: /Neue Buchung|Create.*Booking/i });
      await newButton.first().click();
      await page.waitForTimeout(300);
    });

    // T210 - Verify create booking modal opens
    test('T210 - Create booking modal opens', async ({ page }) => {
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
    });

    // T211 - Verify form has asset selection
    test('T211 - Form has asset selection field', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const assetField = modal.getByText(/Asset|Equipment|Item|Artikel/i);
      await expect(assetField.first()).toBeVisible();
    });

    // T212 - Verify form has date fields
    test('T212 - Form has date fields', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const dateField = modal.getByText(/Date|From|Start|When|Von|Bis|Datum/i);
      await expect(dateField.first()).toBeVisible();
    });

    // T213 - Verify form has booker/user fields
    test('T213 - Form has booker fields', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const bookerField = modal.getByText(/Booked|Person|Who|For|Für|Gebucht/i);
      await expect(bookerField.first()).toBeVisible();
    });

    // T214 - Verify form has cancel button
    test('T214 - Form has cancel button', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const cancelButton = modal.getByRole('button', { name: /Cancel|Close|Abbrechen/i });
      await expect(cancelButton.first()).toBeVisible();
    });

    // T215 - Verify form has submit button
    test('T215 - Form has submit button', async ({ page }) => {
      const modal = page.getByRole('dialog');
      const submitButton = modal.getByRole('button', { name: /Create|Save|Submit|Book|Speichern|Erstellen/i });
      await expect(submitButton.first()).toBeVisible();
    });
  });

  test.describe('9.3 Booking Filters', () => {
    // T216 - Verify status filter is available
    test('T216 - Status filter is available', async ({ page }) => {
      const statusFilter = page.getByText(/Status/i).or(
        page.getByLabel(/Status/i)
      );
      await expect(statusFilter.first()).toBeVisible();
    });

    // T217 - Verify date range filter is available (may be in filter panel)
    test('T217 - Date filter exists', async ({ page }) => {
      // Look for date-related filter or column
      const dateText = page.getByText(/Start|Ende|Date|Period/i);
      await expect(dateText.first()).toBeVisible();
    });

    // T218 - Verify filter panel toggle/access
    test('T218 - Filters are accessible', async ({ page }) => {
      // Look for filter button or filter section
      const filterArea = page.getByText(/Filter|Status|Date/i);
      await expect(filterArea.first()).toBeVisible();
    });
  });

  test.describe('9.4 Booking Navigation', () => {
    // T219 - Verify Bookings is accessible from navigation
    test('T219 - Bookings accessible from navigation', async ({ page }) => {
      // Go to home first
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Click Bookings in navigation
      const navLink = page.locator('[data-nav-label="Bookings"]').or(
        page.getByRole('link', { name: /Bookings/i })
      );
      await navLink.first().click();

      await expect(page).toHaveURL(/\/bookings/);
    });

    // T220 - Verify Bookings shows in navigation when enabled
    test('T220 - Bookings navigation item is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('[data-nav-label="Bookings"]').or(
        page.getByText(/Bookings/i)
      );
      await expect(navLink.first()).toBeVisible();
    });
  });

  test.describe('9.5 Booking Calendar', () => {
    // T221 - Verify calendar view is accessible
    test('T221 - Calendar view is accessible', async ({ page }) => {
      // Navigate to calendar page
      await page.goto(`${BASE_URL}/bookings/calendar`);
      await page.waitForLoadState('networkidle');

      // Should have calendar content
      const calendarContent = page.locator('main, .mantine-Stack-root').first();
      await expect(calendarContent).toBeVisible();
    });

    // T222 - Verify calendar navigation link exists
    test('T222 - Calendar navigation is available', async ({ page }) => {
      // Look for calendar button/link
      const calendarLink = page.getByRole('link', { name: /Calendar/i }).or(
        page.getByRole('button', { name: /Calendar/i })
      );
      await expect(calendarLink.first()).toBeVisible();
    });
  });

  test.describe('9.6 Booking Status', () => {
    // T223 - Verify booking status concepts exist
    test('T223 - Booking status filtering available', async ({ page }) => {
      // Check for status filter options
      const statusArea = page.getByText(/Status|Pending|Confirmed|Completed/i);
      await expect(statusArea.first()).toBeVisible();
    });
  });

  test.describe('9.7 Booking Detail', () => {
    // T224 - Verify booking list can navigate to details
    test('T224 - Booking list structure supports detail view', async ({ page }) => {
      // The list should show bookings as clickable items
      const listArea = page.locator('.mantine-DataTable-root, .mantine-Card-root').first();
      await expect(listArea).toBeVisible();
    });
  });
});
