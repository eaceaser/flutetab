import { expect, test } from '@playwright/test';

test('loads the default A minor scale and both notation views', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'A Minor pentatonic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nakai notation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concert pitch' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^A4,/ })).toBeVisible();
  await expect(page.locator('.score svg')).toHaveCount(2);

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
