import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('crystals-chakra:intro-seen', '1'));
});

test('appearance persists and booking remains beneath the reading grid', async ({ page }) => {
  await page.goto('/');
  await page.locator('.appearance-controls summary').click();
  await page.getByRole('button', { name: 'Forest & ivory' }).click();
  await page.getByLabel('After the readings').selectOption('collection-first');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'forest');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'forest');
  expect(await page.evaluate(() => {
    const info = document.getElementById('information');
    const collection = document.getElementById('collection');
    const grid = document.querySelector('.reading-package-grid');
    const booking = document.getElementById('booking');
    return Boolean(collection.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING) && booking.getBoundingClientRect().top >= grid.getBoundingClientRect().bottom;
  })).toBe(true);
  await expect(page.locator('#questions')).toHaveCount(0);
});

for (const [path, endpoint, loader] of [
  ['/shop', '**/api/products', '.collection-loading'],
  ['/studio', '**/api/studio-config', '.studio-loading-card'],
]) {
  test(`${path} keeps its footer below the viewport during a slow response`, async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(endpoint, async (route) => { await gate; await route.continue(); });
    await page.goto(path);
    await expect(page.locator(loader)).toBeVisible();
    expect(await page.locator('.royal-footer').evaluate((el) => el.getBoundingClientRect().top >= innerHeight - 1)).toBe(true);
    release();
    await expect(page.locator(loader)).toHaveCount(0);
    expect(await page.locator('.royal-footer').evaluate((el) => el.getBoundingClientRect().top >= innerHeight - 1)).toBe(true);
  });
}

test('touch devices do not download or mount the desktop cursor', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  const downloaded = [];
  page.on('request', (request) => downloaded.push(request.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(downloaded.some((url) => url.includes('DesktopCursor'))).toBe(false);
  await expect(page.locator('.tarot-cursor')).toHaveCount(0);
});
