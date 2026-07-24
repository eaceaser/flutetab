import { expect, test } from '@playwright/test';

test('offers a private hands-free listen practice view', async ({ page }) => {
  await page.goto('/?view=listen');

  await expect(page.getByRole('heading', { name: 'Listen practice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start listen practice' })).toBeVisible();
  await expect(page.getByText(/never recorded or uploaded/)).toBeVisible();
  await expect(page.getByText('1 · ♭3 · 4 · 5 · ♭7 · 8')).toBeVisible();
  await expect(page.locator('.practice-bar')).toHaveCount(0);
  await expect(page).toHaveURL(/view=listen/);
});

test('reports denied microphone permission and allows a retry', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new Error('Microphone permission denied');
        }
      }
    });
  });
  await page.goto('/?view=listen');

  await page.getByRole('button', { name: 'Start listen practice' }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone permission denied');
  await expect(page.getByRole('button', { name: 'Try microphone again' })).toBeVisible();
});

test('calibrates, matches, and advances without another action', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
    let sampleIndex = 0;
    class FakeAudioContext {
      state = 'running';
      sampleRate = 48_000;

      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }

      createAnalyser() {
        return {
          fftSize: 2048,
          smoothingTimeConstant: 0,
          disconnect() {},
          getFloatTimeDomainData(samples: Float32Array) {
            for (let index = 0; index < samples.length; index += 1) {
              samples[index] =
                0.25 * Math.sin((2 * Math.PI * 440 * (sampleIndex + index)) / 48_000);
            }
            sampleIndex += samples.length;
          }
        };
      }

      async resume() {}
      async close() {
        this.state = 'closed';
      }
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }]
        })
      }
    });
  });
  await page.goto('/?view=listen');

  await page.getByRole('button', { name: 'Start listen practice' }).click();
  await expect(page.getByText('First, calibrate your flute')).toBeVisible();
  await expect(page.getByText(/1 matched/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('img', { name: 'Nakai notation A4' })).toBeVisible();
  await expect(page.getByLabel('Pitch match tolerance in cents')).toHaveValue('37');
  await expect(page.getByLabel('Enable 10-second note timer')).not.toBeChecked();
  await page.getByRole('button', { name: 'Skip note' }).click();
  await expect(page.getByText(/1 missed/)).toBeVisible();
});

test('listen practice has no page-level mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/?view=listen');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
