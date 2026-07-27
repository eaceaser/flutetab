import { expect, test } from '@playwright/test';

test('builds the Daily Practice worksheet with documented exercise families', async ({ page }) => {
  await page.goto('/?view=practice&range=15');

  await expect(page.getByRole('heading', { name: 'Scale & arpeggio worksheet' })).toBeVisible();
  await expect(page.locator('.exercise-card')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: 'Mode 2 · C Major pentatonic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Broken thirds' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Four-chord dexterity pattern' })).toBeVisible();
  await expect(page.getByText('Range-limited').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concert pitch' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Nakai notation' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Fingering tablature' })).toHaveCount(1);
  await expect(page.locator('.worksheet .sheet-note-names')).toHaveCount(0);

  await page.getByRole('button', { name: 'Play A Minor pentatonic' }).click();
  await expect(page.getByRole('button', { name: 'Stop playback' })).toBeVisible();
});

test('worksheet options and flute range round-trip through the URL', async ({ page }) => {
  await page.goto('/?view=practice&range=15');

  await page.getByRole('checkbox', { name: 'Minor blues' }).uncheck();
  await page.getByRole('checkbox', { name: /Woven scale/ }).uncheck();
  await page.getByLabel('Highest stable note').selectOption('12');

  await expect(page).toHaveURL(/view=practice/);
  await expect(page).toHaveURL(/range=12/);
  await expect(page).toHaveURL(/worksheetScales=/);
  await expect(page).toHaveURL(/sections=/);
  await expect(page.locator('.exercise-card')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: 'Woven scale' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('Highest stable note')).toHaveValue('12');
  await expect(page.getByRole('checkbox', { name: 'Minor blues' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Woven scale/ })).not.toBeChecked();
});

test('worksheet display toggles apply to every exercise and never hide Nakai', async ({ page }) => {
  await page.goto(
    '/?view=practice&range=15&worksheetScales=minor-pentatonic&sections=tonic-arpeggio'
  );
  await page.getByText('Display preferences').click();

  await page.getByRole('checkbox', { name: 'Standard treble clef staff' }).uncheck();
  await page.getByRole('checkbox', { name: 'Flute fingering tab staff' }).uncheck();

  const systems = await page.locator('.worksheet .notation-system').count();
  await expect(page.locator('.worksheet .concert-layer')).toHaveCount(0);
  await expect(page.locator('.worksheet .fingering-layer')).toHaveCount(0);
  await expect(page.locator('.worksheet .nakai-layer')).toHaveCount(systems);
  await expect(page.getByRole('heading', { name: 'Nakai notation' })).toHaveCount(1);
});

test('stores a separate playable range for each flute profile', async ({ page }) => {
  await page.goto('/?view=practice&range=15');

  await page.getByLabel('Fundamental', { exact: true }).selectOption('6');
  await expect(page.getByLabel('Highest stable note')).toHaveValue('12');
  await page.getByLabel('Highest stable note').selectOption('16');

  await page.getByLabel('Fundamental', { exact: true }).selectOption('9');
  await expect(page.getByLabel('Highest stable note')).toHaveValue('15');

  await page.getByLabel('Fundamental', { exact: true }).selectOption('6');
  await expect(page.getByLabel('Highest stable note')).toHaveValue('16');
});

test('mobile worksheets wrap every unified staff without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(
    '/?view=practice&range=15&worksheetScales=minor-pentatonic&sections=thirds,tonic-arpeggio'
  );

  await expect(page.locator('.exercise-card')).toHaveCount(3);
  await expect(page.locator('.fingering-layer[data-aligned="true"]').first()).toBeVisible();

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(pageOverflow).toBeLessThanOrEqual(1);

  const overflowingSystems = await page.locator('.sheet-systems').evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).length
  );
  expect(overflowingSystems).toBe(0);
});

test('worksheet noteheads and fingering tabs stay aligned on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    '/?view=practice&range=15&worksheetScales=minor-pentatonic&sections=tonic-arpeggio'
  );

  const notationSheets = page.locator('.exercise-card .notation-sheet');
  await expect(notationSheets).toHaveCount(2);
  await expect
    .poll(() => page.locator('.fingering-layer[data-aligned="true"]').count())
    .toBe(await page.locator('.notation-system').count());

  const maximumDelta = await page.locator('.notation-system').evaluateAll((systems) =>
    Math.max(
      ...systems.flatMap((system) => {
        const centersFor = (selector: string) =>
          [...system.querySelectorAll(`${selector} .vf-stavenote .vf-notehead`)].map((notehead) => {
            const glyph = notehead.querySelector('text, path');
            const bounds = glyph?.getBoundingClientRect();
            return bounds ? bounds.left + bounds.width / 2 : 0;
          });
        const concert = centersFor('.concert-layer');
        const nakai = centersFor('.nakai-layer');
        const fingerings = [...system.querySelectorAll('.fingering-position')].map((fingering) => {
          const bounds = fingering.getBoundingClientRect();
          return bounds.left + bounds.width / 2;
        });
        return fingerings.flatMap((center, index) => [
          Math.abs(center - concert[index]),
          Math.abs(center - nakai[index])
        ]);
      })
    )
  );

  expect(maximumDelta).toBeLessThanOrEqual(1);
});

test('print view removes controls but retains complete worksheet notation', async ({ page }) => {
  await page.goto(
    '/?view=practice&range=15&worksheetScales=minor-pentatonic&sections=tonic-arpeggio,prompts'
  );
  await expect(page.locator('.fingering-layer[data-aligned="true"]').first()).toBeVisible();

  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('.view-switcher')).toBeHidden();
  await expect(page.locator('.control-panel')).toBeHidden();
  await expect(page.locator('.practice-bar')).toBeHidden();
  await expect(page.locator('.exercise-card')).toHaveCount(2);
  await expect(page.locator('.exercise-card .score-line svg').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Three passes, then one scale song' })).toBeVisible();
});
