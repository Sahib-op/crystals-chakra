import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('crystals-chakra:intro-seen', '1'),
  );
});

test('the design lab is hidden unless requested, and switches palette and order', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.design-lab')).toHaveCount(0);

  await page.goto('/?lab=1');
  const lab = page.locator('.design-lab');
  await expect(lab).toBeVisible();
  await lab.getByRole('button', { name: /Saffron/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'saffron');
  await lab.getByLabel('Section order').selectOption('about-first');
  const aboutBeforeReadings = () =>
    page.evaluate(
      () =>
        !!(
          document
            .getElementById('information')
            .compareDocumentPosition(document.getElementById('tarot')) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    );
  expect(await aboutBeforeReadings()).toBe(true);

  // The lab stays on in this browser across pages until it is closed.
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'saffron');
  await page
    .locator('.design-lab')
    .getByRole('button', { name: 'Close the lab' })
    .click();
  await expect(page.locator('.design-lab')).toHaveCount(0);
  expect(await page.locator('html').getAttribute('data-palette')).toBeNull();
  expect(await aboutBeforeReadings()).toBe(false);
  await page.reload();
  await expect(page.locator('.design-lab')).toHaveCount(0);
});

test('the production layout ignores saved appearance experiments', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'crystals-chakra:appearance:v1',
      JSON.stringify({ palette: 'forest', sectionOrder: 'collection-first' }),
    ),
  );
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Explore the look', { exact: true })).toHaveCount(
    0,
  );
  expect(await page.locator('html').getAttribute('data-palette')).toBeNull();
  expect(
    await page
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--page-dark').trim(),
      ),
  ).toBe('#082c4b');
  expect(
    await page.evaluate(() => {
      const info = document.getElementById('information');
      const collection = document.getElementById('collection');
      const grid = document.querySelector('.reading-package-grid');
      const booking = document.getElementById('booking');
      return (
        Boolean(
          info.compareDocumentPosition(collection) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        booking.getBoundingClientRect().top >=
          grid.getBoundingClientRect().bottom
      );
    }),
  ).toBe(true);
  await expect(page.locator('#questions')).toHaveCount(0);
});

for (const [path, endpoint, loader] of [
  ['/shop', '**/api/products', '.collection-loading'],
  ['/studio', '**/api/studio-config', '.studio-loading-card'],
]) {
  test(`${path} keeps its footer below the viewport during a slow response`, async ({
    page,
  }) => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(endpoint, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(path);
    await expect(page.locator(loader)).toBeVisible();
    expect(
      await page
        .locator('.royal-footer')
        .evaluate((el) => el.getBoundingClientRect().top >= innerHeight - 1),
    ).toBe(true);
    release();
    await expect(page.locator(loader)).toHaveCount(0);
    expect(
      await page
        .locator('.royal-footer')
        .evaluate((el) => el.getBoundingClientRect().top >= innerHeight - 1),
    ).toBe(true);
  });
}

test('touch devices do not download or mount the desktop cursor', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  const downloaded = [];
  page.on('request', (request) => downloaded.push(request.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(downloaded.some((url) => url.includes('DesktopCursor'))).toBe(false);
  await expect(page.locator('.tarot-cursor')).toHaveCount(0);
});

test('the reading dialog fits a shortened touch viewport', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: innerHeight, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: viewport });
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Get My Free Cosmic Reading' })
    .click();
  const field = page.getByLabel('Date of birth');
  await expect(field).toBeFocused();
  await page.evaluate(() => {
    Object.assign(window.visualViewport, { height: 320, offsetTop: 60 });
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', '');
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(60);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(380);
  await expect(field).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Reveal My Reading' })
    .scrollIntoViewIfNeeded();
  const action = await dialog
    .getByRole('button', { name: 'Reveal My Reading' })
    .boundingBox();
  expect(action.y + action.height).toBeLessThanOrEqual(380);
});
