import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Never hit the real counter from tests: stub the tracking script and the count endpoint
test.beforeEach(async ({ page }) => {
  await page.route('https://gc.zgo.at/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://*.goatcounter.com/**', (route) =>
    route.fulfill({ json: { count: '1,234' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
});

test.describe('CV page', () => {
  test('loads with the right heading and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jacob Wood');
    await expect(page).toHaveTitle(/Senior Automation QA Engineer/);
    expect(errors).toEqual([]);
  });

  test('never exposes a phone number', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toMatch(/0?7\d{3}\s?\d{3}\s?\d{3}/);
    expect(html).not.toContain('tel:');
  });

  test('every nav link points at a section that exists', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('#navLinks a').evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      await expect(page.locator(href!)).toHaveCount(1);
    }
  });

  test('download PDF link is served', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByRole('link', { name: 'Download PDF' }).getAttribute('href');
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  });
});

test.describe('Theme toggle', () => {
  test('flips the theme and remembers it after reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const html = page.locator('html');

    await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Report filters', () => {
  test('counts match the markup', async ({ page }) => {
    await page.goto('/');
    const total = await page.locator('#report [data-status]').count();
    const passed = await page.locator('#report [data-status="passed"]').count();
    await expect(page.locator('[data-count="all"]')).toHaveText(String(total));
    await expect(page.locator('[data-count="passed"]')).toHaveText(String(passed));
    await expect(page.locator('[data-count="failed"]')).toHaveText('0');
  });

  test('Skipped shows only skipped tests', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Skipped/ }).click();
    await expect(page.locator('#report [data-status="skipped"]')).toBeVisible();
    await expect(page.locator('#report [data-status="passed"]:visible')).toHaveCount(0);
  });

  test('Failed shows the empty state and All restores everything', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Failed/ }).click();
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('.spec:visible')).toHaveCount(0);

    await page.getByRole('button', { name: /^All/ }).click();
    await expect(page.locator('#emptyState')).toBeHidden();
    await expect(page.locator('.spec')).toHaveCount(6);
    await expect(page.locator('.spec:visible')).toHaveCount(6);
    await expect(page.locator('.spec[open]')).toHaveCount(1);
  });
});

test.describe('Terminal', () => {
  test('shows the full run straight away with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const terminal = page.locator('#terminal');
    await expect(terminal).toHaveAttribute('data-done', 'true');
    await expect(terminal).toContainText('altovita.spec.ts');
    await expect(terminal).toContainText(/\d+ passed/);
  });

  test('per-file counts add up to the total', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const text = await page.locator('#terminal').innerText();
    const total = Number(text.match(/Running (\d+) tests/)![1]);
    const perFile = [...text.matchAll(/\.spec\.ts (\d+) tests?/g)].map((m) => Number(m[1]));
    expect(perFile).toHaveLength(8);
    expect(perFile.reduce((a, b) => a + b, 0)).toBe(total);
    await expect(page.locator('[data-count="all"]')).toHaveText(String(total));
  });

  test('finishes animating on its own', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#terminal')).toHaveAttribute('data-done', 'true', { timeout: 10_000 });
  });
});

test.describe('Layout', () => {
  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('mobile menu opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Toggle menu' });
    const links = page.locator('#navLinks');

    await expect(links).toBeHidden();
    await toggle.click();
    await expect(links).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await links.getByRole('link', { name: 'Skills' }).click();
    await expect(links).toBeHidden();
  });
});

test.describe('Accessibility', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`has no serious axe violations in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto('/');
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('Visit counter', () => {
  test('shows the total from GoatCounter', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#runCount')).toBeVisible();
    await expect(page.locator('#runCount')).toHaveText('· 1,234 runs');
  });

  test('stays hidden while the count is zero', async ({ page }) => {
    await page.route('https://*.goatcounter.com/**', (route) =>
      route.fulfill({ json: { count: '0' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    const counter = page.waitForResponse('**/counter/TOTAL.json');
    await page.goto('/');
    await counter;
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(page.locator('#runCount')).toBeHidden();
  });

  test('stays hidden when the counter request fails', async ({ page }) => {
    await page.route('https://*.goatcounter.com/**', (route) => route.fulfill({ status: 500 }));
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#runCount')).toBeHidden();
  });
});
