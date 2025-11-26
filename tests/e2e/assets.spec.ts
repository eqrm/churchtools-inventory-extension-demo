import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 3: Assets Management Tests (T035-T087)
 * 
 * Tests for asset list view, filtering, different views, CRUD operations,
 * status changes, bulk updates, and labels/barcodes.
 */

test.describe('Assets Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./assets');
    // Wait for the asset list title to load
    await page.waitForSelector('[data-view-key]', { timeout: 10000 });
    // Wait a bit for assets to load from mock
    await page.waitForTimeout(500);
  });

  test.describe('3.1 Asset List View', () => {
    // T035 - Verify Assets page loads and displays asset list
    test('T035 - Assets page loads and displays asset list', async ({ page }) => {
      // The asset list title is "Inventory" at h2 level
      await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
    });

    // T036 - Verify assets from mock data are displayed
    test('T036 - assets from mock data are displayed', async ({ page }) => {
      // Mock data includes Test Item 1, Test Item 2, Test Item 3
      await expect(page.getByText('Test Item 1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Test Item 2')).toBeVisible();
    });

    // T037 - Verify "New Asset" button is visible
    test('T037 - New Asset button is visible', async ({ page }) => {
      // The button text is "New"
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await expect(newButton).toBeVisible();
    });

    // T038 - Verify asset list shows asset name column
    test('T038 - asset list shows asset name column', async ({ page }) => {
      // Asset names should be visible in the list
      await expect(page.getByText('Test Item 1')).toBeVisible({ timeout: 10000 });
    });

    // T039 - Verify asset list shows asset number column
    test('T039 - asset list shows asset number', async ({ page }) => {
      // Asset numbers like CHT-001, CHT-002 should be visible
      await expect(page.getByText('CHT-001')).toBeVisible({ timeout: 10000 });
    });

    // T040 - Verify asset list shows status column/badge
    test('T040 - asset list shows status badge', async ({ page }) => {
      // Wait for assets to load and look for status badges
      // Status could be "available" or "in_use" (as the mock data shows)
      const statusBadge = page.locator('[class*="Badge"]');
      await expect(statusBadge.first()).toBeVisible({ timeout: 10000 });
    });

    // T041 - Verify asset list shows asset type column
    test('T041 - asset list shows asset type', async ({ page }) => {
      // Asset types like "Electronics", "Furniture" should be visible
      const assetType = page.getByText('Electronics').or(page.getByText('Furniture'));
      await expect(assetType.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('3.2 Asset List Actions', () => {
    // T042 - Verify view mode controls are visible
    test('T042 - view mode controls are visible', async ({ page }) => {
      // Look for view controls (Views button or view mode selector)
      const viewsControl = page.getByRole('button', { name: /Views/i }).or(
        page.locator('[class*="SegmentedControl"]')
      );
      await expect(viewsControl.first()).toBeVisible();
    });

    // T043 - Verify filters button is available
    test('T043 - filters button is available', async ({ page }) => {
      const filtersButton = page.getByRole('button', { name: /Filters/i });
      await expect(filtersButton.first()).toBeVisible();
    });

    // T044 - Verify saved views dropdown is available
    test('T044 - saved views dropdown is available', async ({ page }) => {
      // Look for saved views or views menu
      const viewsButton = page.getByRole('button', { name: /Views/i });
      await expect(viewsButton.first()).toBeVisible();
    });
  });

  test.describe('3.3 Asset Creation', () => {
    // T053 - Verify clicking "New Asset" opens asset form modal
    test('T053 - clicking New Asset opens asset form modal', async ({ page }) => {
      // The "New" button is a dropdown menu
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await newButton.click();
      
      // Click "New Asset" in the dropdown
      const newAssetItem = page.getByRole('menuitem', { name: /New Asset/i });
      await expect(newAssetItem).toBeVisible();
      await newAssetItem.click();
      
      // Modal should open with title "Create New Asset"
      const modal = page.getByRole('dialog', { name: /Create New Asset/i });
      await expect(modal).toBeVisible();
    });

    // T054 - Verify asset form contains name input field
    test('T054 - asset form contains name input field', async ({ page }) => {
      // Open dropdown and click New Asset
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await newButton.click();
      await page.getByRole('menuitem', { name: /New Asset/i }).click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for name input field
      const nameInput = page.getByRole('dialog').getByLabel(/Name/i);
      await expect(nameInput.first()).toBeVisible();
    });

    // T055 - Verify asset form contains asset type selector
    test('T055 - asset form contains asset type selector', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await newButton.click();
      await page.getByRole('menuitem', { name: /New Asset/i }).click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for asset type selector label
      const typeLabel = page.getByRole('dialog').getByText(/Asset Type/i).or(
        page.getByRole('dialog').getByText(/Category/i)
      );
      await expect(typeLabel.first()).toBeVisible();
    });

    // T056 - Verify asset form contains status selector
    test('T056 - asset form contains status selector', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await newButton.click();
      await page.getByRole('menuitem', { name: /New Asset/i }).click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for status selector
      const statusLabel = page.getByRole('dialog').getByText(/Status/i);
      await expect(statusLabel.first()).toBeVisible();
    });

    // T061 - Verify cancel button closes form without saving
    test('T061 - cancel button closes form without saving', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New/i }).first();
      await newButton.click();
      await page.getByRole('menuitem', { name: /New Asset/i }).click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      // Click cancel button
      const cancelButton = modal.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();
      
      // Modal should close
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('3.4 Asset Detail View', () => {
    // T063 - Verify clicking asset row navigates to asset detail page
    test('T063 - clicking asset navigates to detail page', async ({ page }) => {
      // Wait for assets to load
      await page.waitForTimeout(1000);
      
      // Click on an asset row or asset name
      const assetLink = page.getByText('Test Item 1');
      await expect(assetLink).toBeVisible({ timeout: 10000 });
      await assetLink.click();
      
      // Should navigate to asset detail page
      await expect(page).toHaveURL(/.*\/assets\/.+/);
    });

    // T064 - Verify asset detail page displays asset name
    test('T064 - asset detail page displays asset name', async ({ page }) => {
      // Navigate to an asset detail
      await page.waitForTimeout(1000);
      const assetLink = page.getByText('Test Item 1');
      await assetLink.click();
      
      await expect(page).toHaveURL(/.*\/assets\/.+/);
      // The asset name should be displayed as a heading
      await expect(page.getByRole('heading', { name: 'Test Item 1' })).toBeVisible();
    });

    // T065 - Verify asset detail page displays asset number
    test('T065 - asset detail page displays asset number', async ({ page }) => {
      await page.waitForTimeout(1000);
      const assetLink = page.getByText('Test Item 1');
      await assetLink.click();
      
      await expect(page).toHaveURL(/.*\/assets\/.+/);
      // Wait for the detail page to load
      await page.waitForTimeout(1000);
      // Asset number is displayed - look for the Badge or just the text
      await expect(page.getByText('CHT-001').first()).toBeVisible({ timeout: 10000 });
    });

    // T066 - Verify asset detail page displays status badge
    test('T066 - asset detail page displays status badge', async ({ page }) => {
      await page.waitForTimeout(1000);
      const assetLink = page.getByText('Test Item 1');
      await assetLink.click();
      
      await expect(page).toHaveURL(/.*\/assets\/.+/);
      await page.waitForTimeout(1000);
      // Status is shown in a Badge - look for status text in a badge
      const statusBadge = page.locator('[class*="Badge"]').filter({ hasText: /Available|In Use|Broken/i });
      await expect(statusBadge.first()).toBeVisible({ timeout: 10000 });
    });

    // T069 - Verify "Back to Assets" or back navigation is available
    test('T069 - back navigation is available', async ({ page }) => {
      await page.waitForTimeout(1000);
      const assetLink = page.getByText('Test Item 1');
      await assetLink.click();
      
      await expect(page).toHaveURL(/.*\/assets\/.+/);
      await page.waitForTimeout(1000);
      
      // Click "Back to Assets" button
      const backButton = page.getByRole('button', { name: /Back to Assets/i });
      await expect(backButton).toBeVisible({ timeout: 10000 });
      await backButton.click();
      
      // Should be back on the assets list (may have query params)
      await expect(page).toHaveURL(/.*\/assets(\?.*)?$/);
    });
  });

  test.describe('3.5 Asset Labels/Barcodes', () => {
    // T084 - Verify barcode/label section is displayed on asset detail
    test('T084 - barcode section is displayed on asset detail', async ({ page }) => {
      await page.waitForTimeout(1000);
      const assetLink = page.getByText('Test Item 1');
      await assetLink.click();
      
      await expect(page).toHaveURL(/.*\/assets\/.+/);
      await page.waitForTimeout(1000);
      
      // Look for the barcode value (CHT-001) which is displayed below the barcode image
      // or the barcode canvas/img element
      const barcodeText = page.getByText('CHT-001');
      await expect(barcodeText.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
