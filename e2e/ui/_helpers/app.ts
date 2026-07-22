import type { Page } from '@playwright/test';

/** Navigate to an app route for composition/page E2E. */
export async function gotoAppRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'load' });
}
