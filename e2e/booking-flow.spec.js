// Playwright E2E Tests
const { test, expect } = require('@playwright/test');

test.describe('Arca Booking App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200');
  });

  test('should show login button on homepage', async ({ page }) => {
    await expect(page.locator('text=Login with Google')).toBeVisible();
  });

  test('full booking flow', async ({ page, context }) => {
    // Note: This requires setting up Google OAuth test credentials
    // For now, we'll mock the authenticated state
    
    // Mock authenticated session
    await context.addCookies([
      {
        name: 'connect.sid',
        value: 'test-session-id',
        domain: 'localhost',
        path: '/'
      }
    ]);

    await page.goto('http://localhost:4200/dashboard');

    // Test 1: Check dashboard loads
    await expect(page.locator('h2', { hasText: 'Arca Account Connection' })).toBeVisible();

    // Test 2: Add Arca credentials
    await page.fill('#arcaUsername', 'test@example.com');
    await page.fill('#arcaPassword', 'testpassword');
    await page.click('button:has-text("Save Credentials")');
    
    // Wait for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // Test 3: View current bookings
    await expect(page.locator('h2', { hasText: 'My Current Bookings' })).toBeVisible();
    
    // Test 4: Add a booking rule
    await page.click('button:has-text("+ Add Rule")');
    await expect(page.locator('text=Browse Available Classes')).toBeVisible();
    
    // Open class browser
    await page.click('button:has-text("Browse Available Classes")');
    
    // Wait for gyms to load
    await page.waitForSelector('text=Kirken', { timeout: 10000 });
    
    // Select a gym
    await page.click('text=Kirken');
    
    // Wait for classes to load
    await page.waitForSelector('.class-item', { timeout: 10000 });
    
    // Select first class
    await page.click('.class-item >> button:has-text("Select for Rule")');
    
    // Verify form is populated
    await expect(page.locator('#className')).not.toHaveValue('');
    
    // Set waiting list
    await page.fill('#maxWaitingList', '2');
    
    // Create rule
    await page.click('button:has-text("Create Recurring Booking Rule")');
    
    // Verify rule was created
    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 5000 });

    // Test 5: Edit the rule
    await page.click('button:has-text("✏️ Edit")');
    await expect(page.locator('h2', { hasText: 'Edit Booking Rule' })).toBeVisible();
    
    // Change waiting list
    await page.fill('#maxWaitingList', '5');
    await page.click('button:has-text("Update Booking Rule")');
    
    // Verify update
    await expect(page.locator('text=Waitlist: ≤5')).toBeVisible();

    // Test 6: Disable rule
    await page.click('button:has-text("Disable")');
    await expect(page.locator('.badge-danger', { hasText: '✕ Disabled' })).toBeVisible();

    // Test 7: Delete rule
    page.on('dialog', dialog => dialog.accept()); // Accept confirmation
    await page.click('button:has-text("Delete")');
    await expect(page.locator('.rule-item')).not.toBeVisible();

    // Test 8: Check booking history
    await expect(page.locator('h2', { hasText: 'Booking History' })).toBeVisible();
  });

  test('mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('.navbar-brand')).toBeVisible();
    
    // Test that elements stack vertically on mobile
    const navbarContent = await page.locator('.navbar-content').boundingBox();
    expect(navbarContent.width).toBeLessThan(400);
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'connect.sid',
        value: 'test-session-id',
        domain: 'localhost',
        path: '/'
      }
    ]);

    await page.goto('http://localhost:4200/dashboard');

    // Try to save invalid credentials
    await page.fill('#arcaUsername', 'invalid');
    await page.fill('#arcaPassword', 'wrong');
    await page.click('button:has-text("Save Credentials")');
    
    // Should show error message
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 10000 });
  });
});

