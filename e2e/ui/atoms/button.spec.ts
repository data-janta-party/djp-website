import { gotoStory, screenshotStory, storyIdFromTitle } from '../_helpers/storybook';
import { expect, test } from '../../test';

const PRIMARY_STORY_ID = storyIdFromTitle('UI/Atoms/Button', 'Primary');

test.describe('Button · Storybook', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await gotoStory(page, PRIMARY_STORY_ID);
  });

  test('renders the primary button story', async ({ page }) => {
    await expect(
      page.locator('#storybook-root').getByRole('button', { name: 'Get started' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('captures primary button screenshot', async ({ page }) => {
    await screenshotStory(page, 'button-primary', (name) => test.info().outputPath(name));
  });
});
