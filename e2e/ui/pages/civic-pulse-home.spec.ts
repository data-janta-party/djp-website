import { gotoAppRoute } from '../_helpers/app';
import { expect, test } from '../../test';

test.describe('CivicPulseHomePage · App', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, '/');
  });

  test('shows brand panels, CTAs, and volunteer form', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByText(/India deserves better options/i)).toBeVisible();
    await expect(page.locator('[data-home-step]')).toHaveCount(2);

    await page.locator('#home-panel-os').scrollIntoViewIfNeeded();
    await expect(
      page.getByText(/Let's build the India we deserve/i),
    ).toBeVisible();
    await expect(page.locator('#home-digital-speech-cta')).toHaveAttribute('href', '/speech');

    await expect(page.getByText(/Contribute with code/i)).toBeAttached();
    await expect(page.getByText(/Contribute with your skills/i)).toBeAttached();
    await expect(page.getByText(/Contribute with your ideas/i)).toBeAttached();
    await expect(page.getByRole('link', { name: /Open GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/data-janta-party',
    );
    await expect(page.getByRole('link', { name: /Open Reddit/i })).toHaveAttribute(
      'href',
      'https://www.reddit.com/r/DataJantaParty',
    );

    await page.locator('#volunteer').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /Stand with us/i })).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /skip to main content/i })).toBeAttached();
  });

  test('navbar links to digital speech and volunteer', async ({ page }) => {
    await expect(page.locator('#navbar-digital-speech')).toHaveAttribute('href', '/speech');
    await expect(page.locator('#navbar-volunteer')).toHaveAttribute('href', '#volunteer');
  });

  test('language switcher changes home copy', async ({ page }) => {
    await expect(page.getByText(/India deserves better options/i)).toBeVisible();
    await page.getByRole('button', { name: /Language/i }).click();
    await page.getByRole('menuitem', { name: 'हिन्दी' }).click();
    await expect(page.getByText(/भारत बेहतर विकल्पों का हकदार है/i)).toBeVisible();
  });

  test('digital speech page is kinetic film only', async ({ page }) => {
    await gotoAppRoute(page, '/speech');
    await expect(page.locator('#kinetic-speech-film')).toBeVisible();
    // Auto-starts on land — no intermediate poster Play gate
    await expect(page.locator('#kinetic-play-button')).toHaveCount(0);
    await expect(page.locator('#kinetic-controls')).toBeVisible();
    await expect(page.locator('#kinetic-speech-audio')).toHaveAttribute(
      'src',
      '/audio/speech-trailer.mp3',
    );
    await expect(page.getByRole('heading', { name: /Which India do you choose/i })).toHaveCount(0);
    await expect(page.locator('#volunteer')).toHaveCount(0);
  });
});
