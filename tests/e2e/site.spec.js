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
  for (const path of ['/', '/shop', '/policies']) {
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
  test('the words open the site, the sky follows the pointer, and it shows once per session', async ({
    page,
  }) => {
    const violations = await watchCsp(page);
    await page.goto('/');
    const intro = page.locator('#intro');
    await expect(intro).toBeVisible();
    const words = page.locator('.intro-enter');
    await expect(words).toBeFocused();
    await expect(words).toContainText('Step into');
    // No card and no skip button: the words are the way in.
    await expect(page.locator('.intro-card, .intro-skip')).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        document.getElementById('root').hasAttribute('inert'),
      ),
    ).toBe(true);
    await page.mouse.move(200, 200);
    await page.mouse.move(260, 240, { steps: 5 });
    await words.click();
    // Software WebGL in CI can delay frames; on devices exit takes ~1 s.
    await expect(intro).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('#main')).toBeFocused();
    await expect(page.locator('main h1')).toContainText('Find Your');
    await page.reload();
    await expect(page.locator('#intro')).toHaveCount(0);
    expect(await violations()).toEqual([]);
  });

  test('scrolling, swiping keys and Escape enter the same way; deep links bypass it', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.intro-enter')).toBeFocused();
    await page.mouse.wheel(0, 200);
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 10_000 });
    for (const key of ['ArrowDown', 'Escape']) {
      await page.evaluate(() => sessionStorage.clear());
      await page.goto('/');
      await expect(page.locator('.intro-enter')).toBeFocused();
      await page.keyboard.press(key);
      await expect(page.locator('#intro')).toHaveCount(0, { timeout: 10_000 });
    }
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

test.describe('welcome section', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('choosing a tarot card opens its story with a link to the card meanings', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#celestial-symbol')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'The High Priestess' }).click();
    const story = page.getByRole('region', { name: 'The High Priestess' });
    await expect(story).toBeVisible();
    await expect(
      story.getByRole('link', { name: /More about the cards/ }),
    ).toHaveAttribute('href', '#card-meanings');
    await story.getByRole('button', { name: 'Close explanation' }).click();
    await expect(story).toHaveCount(0);
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

  for (const path of ['/', '/shop', '/policies', '/studio']) {
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

test.describe('readings and booking', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('one booking panel sits under the reading cards, and tarot books into it', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Reveal What')).toHaveCount(0);
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('#services .reading-grid');
      const panel = document.getElementById('booking');
      const g = grid.getBoundingClientRect();
      const b = panel.getBoundingClientRect();
      return {
        insideReadings: Boolean(panel.closest('#services')),
        below: b.top > g.bottom,
        spansGrid: Math.abs(b.width - g.width) < 2,
      };
    });
    expect(layout).toEqual({
      insideReadings: true,
      below: true,
      spansGrid: true,
    });
    await page.getByRole('link', { name: 'Book a tarot reading' }).click();
    await expect(page.getByLabel('Which reading interests you?')).toHaveValue(
      'tarot',
    );
  });

  test('the header morphs on scroll and the portrait slides in once', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const morph = () =>
      page.evaluate(() =>
        document
          .querySelector('.scroll-header')
          .style.getPropertyValue('--header-morph'),
      );
    expect(await morph()).toBe('0');
    await page.evaluate(() => scrollTo(0, 600));
    await expect.poll(morph, { timeout: 5000 }).toBe('1');
    await page.evaluate(() =>
      document.querySelector('.tarot-portrait').scrollIntoView(),
    );
    await expect(page.locator('.tarot-portrait')).toHaveClass(/is-revealed/);
  });
});
