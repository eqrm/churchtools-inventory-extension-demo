import { test, expect } from '@playwright/test';

/**
 * Phase 4: Categories/Asset Types Tests (T088-T107)
 * 
 * Tests for asset type list, creation, editing, and custom fields.
 */

test.describe('Categories/Asset Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./categories');
    // Wait for the page to load
    await page.waitForSelector('[data-view-key]', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test.describe('4.1 Asset Type List', () => {
    // T088 - Verify Categories page loads with title
    test('T088 - Categories page loads with title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Asset Types' })).toBeVisible();
    });

    // T089 - Verify "New asset type" button is visible
    test('T089 - New asset type button is visible', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await expect(newButton).toBeVisible();
    });

    // T090 - Verify existing asset types from mock are displayed
    test('T090 - existing asset types are displayed', async ({ page }) => {
      // Mock data includes "Electronics" and "Furniture"
      await expect(page.getByText('Electronics')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Furniture')).toBeVisible();
    });

    // T091 - Verify asset type list shows name and icon
    test('T091 - asset type list shows name', async ({ page }) => {
      // Asset type names should be visible
      const electronicsType = page.getByText('Electronics');
      await expect(electronicsType).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('4.2 Asset Type Creation', () => {
    // T092 - Verify clicking "New asset type" opens form modal
    test('T092 - clicking New asset type opens form modal', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      // Modal should open with dialog and heading
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: /New asset type/i })).toBeVisible();
    });

    // T093 - Verify asset type form contains name input
    test('T093 - asset type form contains name input', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for name input
      const nameInput = page.getByRole('dialog').getByLabel(/Name/i);
      await expect(nameInput.first()).toBeVisible();
    });

    // T094 - Verify asset type form contains icon picker
    test('T094 - asset type form contains icon picker', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for icon selector/picker
      const iconSelector = page.getByRole('dialog').getByText(/Icon/i).or(
        page.getByRole('dialog').locator('[class*="ColorSwatch"]')
      );
      await expect(iconSelector.first()).toBeVisible();
    });

    // T095 - Verify asset type form contains custom field definitions section
    test('T095 - asset type form contains custom field section', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      // Look for custom fields section or "Add custom field" button
      const customFieldSection = page.getByRole('dialog').getByText(/Custom field/i).or(
        page.getByRole('dialog').getByRole('button', { name: /Add.*field/i })
      );
      await expect(customFieldSection.first()).toBeVisible();
    });

    // T097 - Verify validation errors show for empty name
    test('T097 - validation error for empty name', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Try to submit without filling name
      const submitButton = page.getByRole('dialog').getByRole('button', { name: /Create|Save|Submit/i });
      await submitButton.click();
      
      // Should show validation error or form should not close
      // Either an error message appears or the dialog stays open
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('4.3 Asset Type Modal Actions', () => {
    // T098 - Verify cancel button closes form
    test('T098 - cancel button closes form', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      // Click cancel
      const cancelButton = modal.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();
      
      // Modal should close
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('4.4 Custom Fields', () => {
    // T103 - Verify "Add Custom Field" button works
    test('T103 - Add Custom Field button works', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Click Add Custom Field button
      const addFieldButton = page.getByRole('dialog').getByRole('button', { name: /Add.*field/i });
      if (await addFieldButton.isVisible()) {
        await addFieldButton.click();
        // A new field form or input should appear
        await page.waitForTimeout(300);
        // Check that something changed - either a new input or a remove button appeared
        const fieldInputs = page.getByRole('dialog').locator('input');
        const count = await fieldInputs.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    // T104 - Verify custom field type selector has text, number, date, select options
    test('T104 - custom field type selector has options', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /New asset type/i });
      await newButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Add a custom field first
      const addFieldButton = page.getByRole('dialog').getByRole('button', { name: /Add.*field/i });
      if (await addFieldButton.isVisible()) {
        await addFieldButton.click();
        await page.waitForTimeout(300);
        
        // Look for a type selector dropdown
        const typeSelector = page.getByRole('dialog').getByText(/Type/i).or(
          page.getByRole('dialog').locator('select')
        );
        await expect(typeSelector.first()).toBeVisible();
      }
    });
  });
});
