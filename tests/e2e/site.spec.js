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
    await expect(
      page.getByRole('group', { name: 'Tarot cards' }).locator('img'),
    ).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'The High Priestess' }).click();
    const story = page.getByRole('region', { name: 'The High Priestess' });
    await expect(story).toBeVisible();
    const illustratedCard = story.getByRole('img', {
      name: 'The High Priestess illustrated tarot card',
    });
    await expect(illustratedCard).toBeVisible();
    await expect
      .poll(() => illustratedCard.evaluate((image) => image.naturalWidth))
      .toBe(192);
    await expect(
      story.getByRole('link', { name: /More about the cards/ }),
    ).toHaveAttribute('href', '#card-meanings');
    await story.getByRole('button', { name: 'Close explanation' }).click();
    await expect(story).toHaveCount(0);
  });
});

test.describe('booking path', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('unsure visitors can add a question to the WhatsApp draft', async ({
    page,
  }) => {
    await page.goto('/#booking');
    const select = page.getByLabel('Which reading interests you?');
    const question = page.getByLabel('What would you like to ask?');
    const panel = page.locator('.contact-panel');
    const whatsapp = panel.getByRole('link', { name: 'Chat on WhatsApp' });
    await expect(select.locator('option:checked')).toHaveText('Choose here');
    await expect(question).toHaveCount(0);
    const height = (await panel.boundingBox()).height;
    await select.selectOption({ label: 'I’m not sure yet' });
    await expect(question).toBeVisible();
    expect((await panel.boundingBox()).height).toBeGreaterThan(height);
    const note = 'नमस्ते! Can we talk about work & family?';
    await question.fill(note);
    const message = () =>
      whatsapp
        .getAttribute('href')
        .then((href) => new URL(href).searchParams.get('text'));
    await expect.poll(message).toContain(note);
    await select.selectOption('birhaat');
    await expect(question).toHaveCount(0);
    expect(await message()).not.toContain(note);
    expect(await message()).toContain('Birhaat Kundli');
  });

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
      page.getByRole('link', { name: /Back to site/ }),
    ).toHaveAttribute('href', '/#collection');
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

  test('a restored sold-out cart line can be removed before checkout', async ({
    page,
  }) => {
    const sold = 'gid://shopify/ProductVariant/10';
    const available = 'gid://shopify/ProductVariant/11';
    await page.addInitScript(
      ({ sold, available }) => {
        localStorage.setItem(
          'crystals-chakra:cart:v1',
          JSON.stringify({
            savedAt: Date.now(),
            lines: { [sold]: 1, [available]: 1 },
          }),
        );
      },
      { sold, available },
    );
    await page.route('**/api/products', (route) =>
      route.fulfill({
        json: {
          mode: 'live',
          nextCursor: null,
          products: [
            {
              id: 'rose',
              title: 'Rose Quartz Band',
              variantId: sold,
              available: false,
            },
            {
              id: 'amethyst',
              title: 'Amethyst Band',
              variantId: available,
              available: true,
            },
          ].map((product) => ({
            ...product,
            image: null,
            description: 'Test product.',
            currency: 'INR',
            amount: '1200',
            variants: [
              {
                id: product.variantId,
                available: product.available,
                title: 'Default Title',
                amount: '1200',
                currency: 'INR',
              },
            ],
          })),
        },
      }),
    );
    await page.goto('/shop');
    await page.getByText('Your cart', { exact: true }).click();
    await expect(page.getByText('Sold out · remove to continue')).toBeVisible();
    const checkout = page.getByRole('button', { name: 'Continue to checkout' });
    await expect(checkout).toBeDisabled();
    await page.getByRole('button', { name: 'Remove Rose Quartz Band' }).click();
    await expect(checkout).toBeEnabled();
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
    await page
      .locator('#tarot')
      .getByRole('link', { name: 'Book a tarot reading' })
      .click();
    await expect(page.getByLabel('Which reading interests you?')).toHaveValue(
      'tarot',
    );
    if (page.viewportSize().width >= 761) {
      const booking = page.locator('#booking');
      const box = await booking.boundingBox();
      expect(box.height).toBeLessThan(page.viewportSize().height - 96);
    }
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
    const trigger = page.locator('.tarot-portrait-trigger');
    await trigger.evaluate((element) => element.scrollIntoView());
    await expect(trigger).toHaveClass(/is-revealed/);
  });
});

test.describe('about astrology, FAQ and the reading guide', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('the basics are easy to find and link both ways with the readings', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    for (const id of [
      'card-meanings',
      'key-terms',
      'birth-details',
      'questions',
    ])
      await expect(page.locator(`#information #${id}`)).toHaveCount(1);
    // Readings -> info.
    await expect(
      page.locator('#tarot a[href="#card-meanings"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('.reading-learn-row a[href="#key-terms"]'),
    ).toBeVisible();
    // Info -> readings: a term link selects that reading in the booking panel.
    await page
      .locator('#term-dasha')
      .getByRole('link', { name: 'Parashara Patrika Plus' })
      .click();
    await expect(page.getByLabel('Which reading interests you?')).toHaveValue(
      'parashara',
    );
    // The old final Questions section is gone; its contacts moved here.
    await expect(page.locator('section#questions')).toHaveCount(1);
    await expect(page.locator('#questions a[href^="mailto:"]')).toBeVisible();
    await expect(page.locator('#questions .royal-faq details')).toHaveCount(4);
    // The three-tab box is gone; the proof note sits beside the title.
    await expect(page.locator('.chapter-tabs')).toHaveCount(0);
    await expect(page.locator('.science-hero .proof-note h3')).toHaveText(
      'Precision is not the same as proof.',
    );
    const birth = page.locator('#birth-details');
    await expect(birth.locator('h3')).toContainText(
      'For a full reading, you need',
    );
    for (const [hinglish, hindi] of [
      ['Janam Tithi', 'जन्म तिथि'],
      ['Janam Samay', 'जन्म समय'],
      ['Janam Sthaan', 'जन्म स्थान'],
    ]) {
      await expect(birth.getByText(hinglish)).toBeVisible();
      await expect(birth.getByText(hindi)).toBeVisible();
    }
  });

  test('the reading guide has the full FAQ and never invents business facts', async ({
    page,
  }) => {
    await page.goto('/how-readings-work');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'How a reading',
    );
    await expect(page.locator('#all-questions details')).toHaveCount(10);
    await expect(page.locator('.guide-pending').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Book a reading' }),
    ).toHaveAttribute('href', '/#booking');
  });
});

test.describe('site palette', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('the ivory palette and section order ignore old design-lab preferences', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'crystals-chakra:appearance:v1',
        JSON.stringify({ palette: 'plum', sectionOrder: 'about-first' }),
      );
      localStorage.setItem('crystals-chakra:design-lab', '1');
    });
    // Readings → Collection → About Astrology, whatever a browser saved.
    const order = () =>
      page.evaluate(() =>
        ['tarot', 'services', 'collection', 'information'].map(
          (id) => document.getElementById(id).getBoundingClientRect().top,
        ),
      );
    const ascending = (tops) => tops.every((top, i) => !i || top > tops[i - 1]);
    await page.goto('/?lab=1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Design lab', { exact: false })).toHaveCount(0);
    expect(await page.locator('html').getAttribute('data-palette')).toBeNull();
    await expect(page.locator('#home')).toHaveCSS(
      'background-image',
      /rgb\(255, 254, 248\).*rgb\(239, 237, 228\)/,
    );
    expect(ascending(await order())).toBe(true);
  });
});

test.describe('welcome, cursor and side menu', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('the 3D rings use their own drawings and illustration loads on selection', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop WebGL scene');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const loaded = new Set();
    page.on('response', (response) => {
      const name = new URL(response.url()).pathname;
      if (response.ok() && name.startsWith('/images/tarot/')) loaded.add(name);
    });
    await page.getByRole('button', { name: 'Explore in 3D' }).click();
    await expect(page.locator('.celestial-webgl canvas')).toBeVisible();
    expect(loaded.size).toBe(0);
    await page.getByRole('button', { name: 'The Moon' }).click();
    await expect(
      page.getByRole('img', { name: 'The Moon illustrated tarot card' }),
    ).toBeVisible();
    await expect.poll(() => [...loaded]).toEqual(['/images/tarot/moon.jpg']);
  });

  test('the 3D rings and the whole card row fit the first screen', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop layout');
    const viewports = [
      [800, 600, 'no-preference'],
      [1024, 576, 'no-preference'],
      [1280, 720, 'no-preference'],
      [1366, 768, 'no-preference'],
      [1920, 880, 'no-preference'],
      [800, 600, 'reduce'],
      [1280, 720, 'reduce'],
    ];
    for (const [width, height, reducedMotion] of viewports) {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      if (reducedMotion === 'reduce')
        await expect(
          page.getByRole('button', { name: 'Explore in 3D' }),
        ).toBeVisible();
      const cards = page
        .getByRole('group', { name: 'Tarot cards' })
        .getByRole('button');
      await expect(cards).toHaveCount(6);
      for (const card of await cards.all()) {
        const box = await card.boundingBox();
        expect(box.y + box.height).toBeLessThanOrEqual(height);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      const art = await page.locator('.celestial-webgl').boundingBox();
      expect(art.y).toBeGreaterThanOrEqual(60);
      if (width === 1920) expect(art.width / art.height).toBeGreaterThan(1.1);
      if (height >= 720) {
        const lamp = page.locator('#tarot .toran-flame').first();
        await expect
          .poll(
            async () => {
              const box = await lamp.boundingBox();
              return box.y + box.height;
            },
            { message: `Lamp at ${width}×${height} (${reducedMotion})` },
          )
          .toBeLessThanOrEqual(height);
      }
    }
  });

  test('the custom cursor draws above the free-reading dialog', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 320, { steps: 4 });
    const cursor = page.locator('.tarot-cursor');
    await expect(cursor).toHaveCount(1, { timeout: 10_000 });
    await page.getByRole('button', { name: /Free Cosmic Reading/ }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    // Both are in the top layer; the cursor was raised after the dialog.
    await expect
      .poll(() => cursor.evaluate((el) => el.matches(':popover-open')))
      .toBe(true);
  });

  test('the side menu stays open after a click until the mouse leaves', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'hover only');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const rail = page.locator('.morph-sidebar');
    const box = await rail.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 6,
    });
    await expect(rail).toHaveClass(/is-expanded/);
    await page
      .locator('.morph-icons a[aria-label="About Astrology"]')
      .click({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await expect(rail).toHaveClass(/is-expanded/);
    await page.mouse.move(800, 400, { steps: 6 });
    await expect(rail).not.toHaveClass(/is-expanded/);
  });
});

test.describe('loading and touch', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(SKIP_INTRO));

  test('legacy privacy link scrolls after the policies page loads', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(/\/assets\/Policies-.*\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/policies#privacy$/);
    await expect(page.locator('#privacy')).toBeInViewport();
  });

  test('malformed paths return 400 without stopping the preview', async ({
    request,
  }) => {
    expect((await request.get('/bad%ZZ')).status()).toBe(400);
    expect((await request.get('/')).ok()).toBe(true);
  });

  test('the footer stays below the fold while the shop loads', async ({
    page,
  }) => {
    await page.route(/\/assets\/Shop-.*\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.route(/\/api\/products/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 9000));
      await route.continue();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const footerTop = () =>
      page.evaluate(
        () =>
          document.querySelector('.royal-footer').getBoundingClientRect().top,
      );
    const height = page.viewportSize().height;
    await page
      .locator('#collection')
      .getByRole('link', { name: /Shop/ })
      .click();
    await expect(page.getByText('Opening the shop…')).toBeVisible();
    expect(await footerTop()).toBeGreaterThanOrEqual(height);
    await expect(page.getByText('Gathering the collection…')).toBeVisible();
    expect(await footerTop()).toBeGreaterThanOrEqual(height);
    await expect(page.getByText(/Still gathering the collection/)).toBeVisible({
      timeout: 8000,
    });
    expect(await footerTop()).toBeGreaterThanOrEqual(height);
  });

  test('the reading dialog moves above the on-screen keyboard', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch devices only');
    // Playwright cannot open a real keyboard, so stand in a visual viewport
    // that shrinks the way a phone's does when it opens.
    await page.addInitScript(() => {
      const fake = new EventTarget();
      let height = window.innerHeight;
      Object.defineProperties(fake, {
        height: { get: () => height },
        width: { get: () => window.innerWidth },
        offsetTop: { get: () => 0 },
        offsetLeft: { get: () => 0 },
        scale: { get: () => 1 },
      });
      window.__setKeyboard = (px) => {
        height = window.innerHeight - px;
        fake.dispatchEvent(new Event('resize'));
      };
      Object.defineProperty(window, 'visualViewport', { get: () => fake });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Free Cosmic Reading/ }).click();
    const field = page.locator('#reading-dob');
    await expect(field).toBeFocused();
    const keyboard = 340;
    await page.evaluate((px) => window.__setKeyboard(px), keyboard);
    await expect(page.locator('html')).toHaveClass(/keyboard-open/);
    const visibleBottom = page.viewportSize().height - keyboard;
    const box = await page.locator('.cosmic-reading-dialog').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(visibleBottom);
    const fieldBox = await field.boundingBox();
    expect(fieldBox.y + fieldBox.height).toBeLessThanOrEqual(visibleBottom);
    // The submit button is reachable by scrolling inside the dialog.
    const submit = page.getByRole('button', { name: 'Reveal My Reading' });
    await submit.scrollIntoViewIfNeeded();
    const submitBox = await submit.boundingBox();
    expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(visibleBottom);
    await page.evaluate(() => window.__setKeyboard(0));
    await expect(page.locator('html')).not.toHaveClass(/keyboard-open/);
  });
});
