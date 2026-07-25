import { expect, test } from '../../test';
import { gotoAppRoute } from '../_helpers/app';

/**
 * Kinetic speech film — behaviour + visual smoke.
 * Full beat-by-beat screenshot matrix is heavy; this catches the regression where
 * audio runs while the GSAP visual track stays blank (timeline race / no scrub).
 */
test.describe('Kinetic speech film', () => {
  test('play gate starts film and paints manifesto text while audio advances', async ({
    page,
  }, testInfo) => {
    await gotoAppRoute(page, '/speech');
    await expect(page.locator('#kinetic-speech-film')).toBeVisible();
    await expect(page.locator('#kinetic-play-button')).toBeVisible();
    await expect(page.locator('#kinetic-control-home')).toBeVisible();

    const posterShot = testInfo.outputPath('kinetic-speech-poster.png');
    await page.screenshot({ path: posterShot, fullPage: false });
    await testInfo.attach('kinetic-speech-poster', {
      path: posterShot,
      contentType: 'image/png',
    });

    await page.locator('#kinetic-play-button').click();

    // Wait out cold trailer buffer / loading spinner
    await expect(page.locator('#kinetic-media-loading')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(page.locator('#kinetic-controls')).toBeVisible({ timeout: 15_000 });

    // Gesture unlock if autoplay policy blocked soundtrack
    const soundBtn = page.locator('#kinetic-control-sound');
    if (await soundBtn.count()) {
      await soundBtn.click();
    }

    // First pair lands ~1.5s in; wait for audio to advance past that.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const audio = document.getElementById(
              'kinetic-speech-audio',
            ) as HTMLAudioElement | null;
            return audio && !audio.paused ? audio.currentTime : 0;
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(1.4);

    // At least one primary type node must be painted (opacity > 0).
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const nodes = document.querySelectorAll(
              '[data-k-node], [data-k-sticky], [data-k-sticky-pair]',
            );
            return [...nodes].some((el) => {
              const cs = getComputedStyle(el);
              return parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden';
            });
          }),
        { timeout: 10_000 },
      )
      .toBe(true);

    // Shared type-anchor contract (centered stage rail).
    await expect(page.locator('.kinetic-type-anchor').first()).toBeAttached();

    // No document scroll — film fills the viewport.
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2),
      )
      .toBe(true);

    const shotPath = testInfo.outputPath('kinetic-speech-playing.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    await testInfo.attach('kinetic-speech-playing', {
      path: shotPath,
      contentType: 'image/png',
    });
  });

  test('pause then big-play resume keeps a visible visual track', async ({ page }, testInfo) => {
    await gotoAppRoute(page, '/speech');
    await expect(page.locator('#kinetic-speech-film')).toBeVisible();
    await expect(page.locator('#kinetic-play-button')).toBeVisible();
    await page.locator('#kinetic-play-button').click();

    await expect(page.locator('#kinetic-media-loading')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(page.locator('#kinetic-controls')).toBeVisible({ timeout: 15_000 });

    const soundBtn = page.locator('#kinetic-control-sound');
    if (await soundBtn.count()) {
      await soundBtn.click();
    }

    await expect(page.locator('#kinetic-control-pause')).toBeVisible({
      timeout: 15_000,
    });

    // Let the film paint the first slide
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            [...document.querySelectorAll('[data-k-node], [data-k-sticky]')].some((el) => {
              const cs = getComputedStyle(el);
              return parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden';
            }),
          ),
        { timeout: 12_000 },
      )
      .toBe(true);

    await page.locator('#kinetic-control-pause').click();
    await expect(page.locator('#kinetic-play-button')).toBeVisible();
    await expect(page.locator('#kinetic-control-resume')).toHaveCount(0);
    await page.locator('#kinetic-play-button').click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const audio = document.getElementById(
              'kinetic-speech-audio',
            ) as HTMLAudioElement | null;
            return Boolean(audio && !audio.paused && audio.currentTime > 0.5);
          }),
        { timeout: 10_000 },
      )
      .toBe(true);

    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            [...document.querySelectorAll('[data-k-node], [data-k-sticky]')].some((el) => {
              const cs = getComputedStyle(el);
              return parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden';
            }),
          ),
        { timeout: 8_000 },
      )
      .toBe(true);

    const shotPath = testInfo.outputPath('kinetic-speech-after-resume.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    await testInfo.attach('kinetic-speech-after-resume', {
      path: shotPath,
      contentType: 'image/png',
    });
  });
});
