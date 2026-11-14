import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SKIP_INTRO = () =>
  sessionStorage.setItem('crystals-chakra:intro-seen', '1');

// Collect any Content-Security-Policy violation the page triggers.
async function watchCsp(page) {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__csp.push(`${event.violatedDirective} ${event.blockedURI}`),
    );
  });
  return () => page.evaluate(() => window.__csp);
}

test.describe('prerendered public HTML', () => {
  for (const path of ['/', '/shop', '/policies', '/how-readings-work']) {
    test(`${path} works before JavaScript with security headers`, async ({
      request,
    }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers['content-security-policy']).toContain("script-src 'self'");
      expect(headers['content-security-policy']).toContain(
        "frame-ancestors 'none'",
      );
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['permissions-policy']).toContain('camera=()');
      const html = await response.text();
      expect(html).toMatch(/<h1[\s>]/);
      expect(html).toContain('href="https://wa.me/919810228209');
      expect(html).toContain('href="tel:+919810228209"');
      expect(html).toContain(`data-prerendered="${path}"`);
      expect(html).toContain('og:image" content="https://');
    });
  }

  test('client routes use the empty shell and static files are not rewritten', async ({
    request,
  }) => {
    const studio = await (await request.get('/studio')).text();
    expect(studio).toContain('<div id="root"></div>');
    expect(
      (await request.get('/robots.txt')).headers()['content-type'],
    ).toContain('text/plain');
    const asset = (await request.get('/')).text();
    const script = (await asset).match(/src="(\/assets\/[^"]+\.js)"/)[1];
    expect((await request.get(script)).headers()['cache-control']).toContain(
      'immutable',
    );
  });
});

test.describe('welcome screen', () => {
  test('appears on entry, follows the pointer and the card opens the site', async ({
    page,
  }) => {
    const violations = await watchCsp(page);
    await page.goto('/');
    const intro = page.locator('#intro');
    await expect(intro).toBeVisible();
    await expect(page.locator('.intro-enter')).toBeFocused();
    expect(
      await page.evaluate(() =>
        document.getElementById('root').hasAttribute('inert'),
      ),
    ).toBe(true);
    await page.mouse.move(200, 200);
    await page.mouse.move(260, 240, { steps: 5 });
    await page.locator('.intro-enter').click({ force: true });
    await expect(intro).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('#main')).toBeFocused();
    await expect(page.locator('main h1')).toContainText('Make Room for');
    await page.reload();
    await expect(page.locator('#intro')).toHaveCount(0);
    expect(await violations()).toEqual([]);
  });

  test('Escape, skip and deep links bypass it', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Escape');
    await expect(page.locator('#intro')).toHaveCount(0);
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/');
    await page.mouse.wheel(0, 160);
    await expect(page.locator('#intro')).toHaveCount(0);
    for (const path of ['/#booking', '/shop', '/policies']) {
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(path);
      await expect(page.locator('#intro')).toHaveCount(0);
    }
  });

  test('is accessible while open', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#intro')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('#intro')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('booking path', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('a package opens WhatsApp with that reading, and the hub explains booking', async ({
    page,
  }) => {
    const violations = await watchCsp(page);
    await page.goto('/');
    const ask = page.getByRole('link', {
      name: /Ask on WhatsApp about Bhrigu Patrika/,
    });
    const href = await ask.getAttribute('href');
    expect(new URL(href).origin).toBe('https://wa.me');
    expect(decodeURIComponent(new URL(href).search)).toContain(
      'Bhrigu Patrika',
    );
    await page.goto('/#booking');
    const hub = page.locator('#booking');
    await expect(hub.getByRole('heading', { name: /Book Your/ })).toBeVisible();
    await expect(hub.getByText('How booking works')).toBeVisible();
    await expect(
      hub.getByText(/booked only once the studio confirms/),
    ).toBeVisible();
    // Interact only after hydration has attached the handlers.
    await page.waitForLoadState('networkidle');
    await hub.getByLabel('Which reading interests you?').selectOption('tarot');
    await expect(
      hub.getByRole('link', { name: /Chat on WhatsApp/ }),
    ).toHaveAttribute('href', /Tarot%20Reading/);
    await expect(
      hub.getByRole('link', { name: /Call the Studio/ }),
    ).toHaveAttribute('href', 'tel:+919810228209');
    expect(await violations()).toEqual([]);
  });

  test('legacy booking links land on the contact hub', async ({ page }) => {
    await page.goto('/book?reading=tarot');
    await expect(page).toHaveURL(/#booking$/);
  });
});

test.describe('pages', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  for (const path of [
    '/',
    '/shop',
    '/policies',
    '/studio',
    '/how-readings-work',
  ]) {
    test(`${path} has no serious accessibility violations, CSP errors or overflow at 320px`, async ({
      page,
    }) => {
      const violations = await watchCsp(page);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations
          .filter((v) => ['serious', 'critical'].includes(v.impact))
          .map((v) => `${v.id}: ${v.nodes.length}`),
      ).toEqual([]);
      expect(await violations()).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('policies show pending business facts instead of inventing them', async ({
    page,
  }) => {
    await page.goto('/policies');
    await expect(page.getByText(/Draft\./)).toBeVisible();
    await expect(
      page.locator('#grievance .policy-pending').first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Privacy notice' }),
    ).toBeVisible();
  });

  test('the preview shop labels illustrative items and keeps checkout off', async ({
    page,
  }) => {
    await page.goto('/shop');
    await expect(
      page.getByText('A first look at the collection.'),
    ).toBeVisible();
    await expect(
      page.getByText(/do\s+not claim that any product heals/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /checkout/i })).toHaveCount(
      0,
    );
  });
});
