import type { Page } from '@playwright/test';

const STORYBOOK_ORIGIN = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const STORY_ROOT = '#storybook-root';

/** Build a Storybook iframe URL for a story id (e.g. ui-atoms-button--primary). */
export function storyUrl(storyId: string): string {
  const params = new URLSearchParams({
    id: storyId,
    viewMode: 'story',
  });
  return `${STORYBOOK_ORIGIN}/iframe.html?${params.toString()}`;
}

/**
 * Convert title + story name to kebab story id.
 * title: 'UI/Atoms/Button', story: 'Primary' → 'ui-atoms-button--primary'
 */
export function storyIdFromTitle(title: string, storyName: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const storySlug = storyName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${slug}--${storySlug}`;
}

export async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(storyUrl(storyId), {
    waitUntil: 'domcontentloaded',
  });
  await page.locator(STORY_ROOT).waitFor({ state: 'visible', timeout: 15_000 });
  await page
    .locator(`${STORY_ROOT} [data-slot="button"]`)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}

export async function screenshotStory(
  page: Page,
  filePrefix: string,
  outputPath: (name: string) => string,
): Promise<void> {
  const viewport = page.viewportSize();
  const viewportLabel = `${viewport?.width ?? 0}x${viewport?.height ?? 0}`;

  await page.locator(STORY_ROOT).screenshot({
    path: outputPath(`${filePrefix}-${viewportLabel}.png`),
  });
}
