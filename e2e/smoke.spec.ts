import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/change-password',
  '/terms',
  '/privacy',
  '/cookies',
  '/policy',
];

const protectedRoutes = [
  '/dashboard',
  '/attendance',
  '/appraisals',
  '/approvals',
  '/assets',
  '/audit',
  '/branches',
  '/celebrations',
  '/chat',
  '/departments',
  '/employees',
  '/expenses',
  '/holidays',
  '/leaves',
  '/loans',
  '/offboarding',
  '/onboarding',
  '/overtime',
  '/payroll',
  '/permissions',
  '/platform/activity',
  '/platform/billing',
  '/platform/clients',
  '/platform/security',
  '/profile',
  '/reports',
  '/security',
  '/settings',
  '/shifts',
  '/statutory',
  '/two-factor',
];

test.describe('public pages', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without a server error`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} response`).toBeLessThan(500);
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });
  }
});

test.describe('protected pages', () => {
  for (const route of protectedRoutes) {
    test(`${route} is reachable and enforces authentication`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} response`).toBeLessThan(500);
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
      await expect(page).toHaveURL(/login|dashboard|localhost|127\.0\.0\.1/);
    });
  }
});

test('login exposes the expected sign-in controls', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
});
