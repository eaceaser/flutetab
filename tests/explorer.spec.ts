import { expect, test } from '@playwright/test';

test('loads the default A minor scale and both notation views', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'A Minor pentatonic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nakai notation' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concert pitch' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^A4,/ })).toBeVisible();
  await expect(page.locator('.score-line svg').first()).toBeVisible();
  expect(await page.locator('.score-line svg').count()).toBeGreaterThanOrEqual(2);

  await page.getByRole('button', { name: 'Play scale' }).click();
  await expect(page.getByRole('button', { name: 'Stop playback' })).toBeVisible();
});

test('updates the shareable URL when scale settings change', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Scale type').selectOption('dorian');
  await page.getByLabel('Scale root').selectOption('2');

  await expect(page).toHaveURL(/scale=dorian/);
  await expect(page).toHaveURL(/root=D/);
  await expect(page.getByRole('heading', { name: 'D Dorian' })).toBeVisible();
});

test('mobile layout has no page-level horizontal overflow and keeps practice controls visible', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: 'Play scale' })).toBeVisible();
  await expect(page.getByLabel('Direction', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tempo in beats per minute')).toBeVisible();
});

test('deep links restore settings', async ({ page }) => {
  await page.goto('/?flute=F%233&scale=minor-blues&root=G%23&direction=both&tempo=112');

  await expect(page.getByLabel('Fundamental', { exact: true })).toHaveValue('6');
  await expect(page.getByLabel('Register', { exact: true })).toHaveValue('3');
  await expect(page.getByLabel('Scale type', { exact: true })).toHaveValue('minor-blues');
  await expect(page.getByLabel('Scale root', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel('Direction', { exact: true })).toHaveValue('both');
});

test('long scales wrap into systems without staff scrollbars', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/?scale=chromatic');

  const notationSheet = page.locator('.notation-sheet');
  await expect
    .poll(() => notationSheet.locator('.notation-system').count())
    .toBeGreaterThanOrEqual(4);
  await expect(notationSheet.getByRole('img')).toHaveCount(13);
  await expect(notationSheet.getByRole('heading', { name: 'Concert pitch' })).toHaveCount(1);
  await expect(notationSheet.getByRole('heading', { name: 'Nakai notation' })).toHaveCount(1);
  await expect(notationSheet.getByRole('heading', { name: 'Fingering tablature' })).toHaveCount(1);

  const overflowingSystems = await page.locator('.sheet-systems').evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).length
  );
  expect(overflowingSystems).toBe(0);
});

test('desktop fingering glyphs align with their rendered Nakai noteheads', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?scale=chromatic');
  const notationSheet = page.locator('.notation-sheet');
  await expect(notationSheet.locator('.fingering-position').first()).toBeVisible();
  await expect
    .poll(() => notationSheet.locator('.fingering-layer[data-aligned="true"]').count())
    .toBe(await notationSheet.locator('.notation-system').count());

  const measurements = await notationSheet.locator('.notation-system').evaluateAll((systems) =>
      systems.flatMap((system) => {
        const centersFor = (selector: string) =>
          [...system.querySelectorAll(`${selector} .vf-stavenote .vf-notehead`)].map((notehead) => {
            const glyph = notehead.querySelector('text, path');
            const bounds = glyph?.getBoundingClientRect();
            return bounds ? bounds.left + bounds.width / 2 : 0;
          });
        const concertNoteheads = centersFor('.concert-layer');
        const nakaiNoteheads = centersFor('.nakai-layer');
        const fingerings = [...system.querySelectorAll('.fingering-position')].map((fingering) => {
          const bounds = fingering.getBoundingClientRect();
          return bounds.left + bounds.width / 2;
        });
        const keySignature = system
          .querySelector('.nakai-layer .vf-keysignature')
          ?.getBoundingClientRect();
        const firstNakaiGlyph = system
          .querySelector('.nakai-layer .vf-stavenote .vf-notehead text, .nakai-layer .vf-stavenote .vf-notehead path')
          ?.getBoundingClientRect();
        return [
          {
            deltas: fingerings.flatMap((center, index) => [
              Math.abs(center - concertNoteheads[index]),
              Math.abs(center - nakaiNoteheads[index])
            ]),
            preambleClearance:
              keySignature && firstNakaiGlyph ? firstNakaiGlyph.left - keySignature.right : 99
          }
        ];
      })
    );

  expect(Math.max(...measurements.flatMap((measurement) => measurement.deltas))).toBeLessThanOrEqual(1);
  expect(Math.min(...measurements.map((measurement) => measurement.preambleClearance))).toBeGreaterThanOrEqual(6);
});

test('music systems use consistent left-aligned engraving spacing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?scale=chromatic');

  const notationSheet = page.locator('.notation-sheet');
  await expect(notationSheet.locator('.notation-system')).toHaveCount(2);
  await expect
    .poll(() => notationSheet.locator('.fingering-layer[data-aligned="true"]').count())
    .toBe(2);

  const layout = await notationSheet.locator('.notation-system').evaluateAll((systems) =>
    systems.map((system) => {
      const systemBounds = system.getBoundingClientRect();
      const centers = [...system.querySelectorAll('.concert-layer .vf-stavenote .vf-notehead')].map(
        (notehead) => {
          const glyph = notehead.querySelector('text, path');
          const bounds = glyph?.getBoundingClientRect();
          return bounds ? bounds.left + bounds.width / 2 - systemBounds.left : 0;
        }
      );
      return {
        centers,
        width: systemBounds.width
      };
    })
  );

  expect(Math.abs(layout[0].centers[0] - layout[1].centers[0])).toBeLessThanOrEqual(1);
  for (const system of layout) {
    const gaps = system.centers.slice(1).map((center, index) => center - system.centers[index]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  }
  expect(layout[1].centers.at(-1) ?? 0).toBeLessThan(layout[1].width * 0.5);
});
