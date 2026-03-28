import { test, expect } from '@playwright/test';

test.describe('홈 페이지', () => {
  test('페이지가 성공적으로 로드된다', async ({ page }) => {
    await page.goto('/');
    // Title contains "돈줍" or site name
    await expect(page).toHaveTitle(/돈줍/);
    // Main content area exists
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('네비게이션 바가 표시된다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible();
  });
});
