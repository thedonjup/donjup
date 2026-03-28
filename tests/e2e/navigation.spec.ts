import { test, expect } from '@playwright/test';

test.describe('기본 네비게이션', () => {
  test('홈 -> 검색 페이지 이동', async ({ page }) => {
    await page.goto('/');
    // Navigate to search with query
    await page.goto('/search?q=강남');
    await expect(page).toHaveURL(/\/search/);
    // Page loaded (not error page)
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('아파트 상세 페이지 URL 접근', async ({ page }) => {
    // Direct URL navigation to apt detail
    // Use a pattern that tests routing works, even if specific apt doesn't exist
    const response = await page.goto('/apt/서울/test-complex');
    // Should get a response (200 or 404, but not server error 500)
    expect(response?.status()).toBeLessThan(500);
  });
});
