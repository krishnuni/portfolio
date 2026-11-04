import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage, project destinations and the real CV are available', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Vai\s*Krishnan/ })).toBeVisible();
  const surface = page.locator('[data-surface]');
  await expect(surface.locator('[data-surface-toggle]')).toBeEnabled({ timeout: 20000 });
  await surface.getByLabel('Surface phase', { exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(surface.getByLabel('Surface phase', { exact: true })).toHaveValue('0');
  await expect(surface.locator('[data-surface-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('section#hush')).toBeVisible();
  for (const id of ['hush', 'gateway', 'search-atlas']) {
    const response = await request.get(`work/${id}/`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('What I built');
  }
  const cv = await request.get('documents/Vai_Krishnan_CV.pdf');
  expect(cv.status()).toBe(200);
  expect((await cv.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('the project cutaway works through named controls and the keyboard', async ({ page }) => {
  await page.goto('./');
  const cutaway = page.locator('[data-cutaway]').first();
  await cutaway.getByRole('button', { name: 'Structure', exact: true }).click();
  await expect(cutaway.getByRole('button', { name: 'Structure', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(cutaway.locator('[data-cutaway-range]')).toHaveValue('100');
  await cutaway.locator('[data-cutaway-range]').focus();
  await page.keyboard.press('Home');
  await expect(cutaway.locator('[data-cutaway-range]')).toHaveValue('0');
  await cutaway.getByRole('button', { name: 'Experience', exact: true }).click();
  await expect(cutaway.getByRole('button', { name: 'Experience', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('the weighted search study compares real computed results and supports editing', async ({
  page,
}) => {
  await page.goto('./');
  const root = page.locator('[data-search-study]');
  await root.getByRole('button', { name: 'See result', exact: true }).click();
  const optimal = Number(await root.locator('[data-search-cost]').innerText());
  expect(optimal).toBeGreaterThan(0);
  await root.getByLabel('Search algorithm', { exact: true }).selectOption('bfs');
  await root.getByRole('button', { name: 'See result', exact: true }).click();
  const bfs = Number(await root.locator('[data-search-cost]').innerText());
  expect(bfs).toBeGreaterThan(optimal);
  await root.getByLabel('Search history position').focus();
  await page.keyboard.press('Home');
  await expect(root.locator('[data-search-visited]')).toHaveText('0');
  const cell = root.locator('[data-cell="0"]');
  await expect(cell).toHaveAccessibleName('Row 1, column 1: cost 1');
  await cell.click();
  await expect(cell).toHaveAccessibleName('Row 1, column 1: wall');
  await root.getByRole('button', { name: 'Reset terrain', exact: true }).click();
  await expect(cell).toHaveAccessibleName('Row 1, column 1: cost 1');
});
test('navigation, case study and reading controls work at the active viewport', async ({
  page,
  isMobile,
}) => {
  await page.goto('./');
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  }
  await page.locator('#site-navigation').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/#about$/);
  if (isMobile)
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  await page.goto('work/hush/');
  const study = page.locator('[data-reading-study]');
  await study.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(study).toHaveClass(/reading-night/);
  await study.getByLabel('Reading study type size').focus();
  await page.keyboard.press('End');
  await expect(study.locator('output')).toHaveText('32 px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('reduced-motion presentation and selected pages pass automated accessibility checks', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['./', 'work/hush/', 'resume/']) {
    await page.goto(path);
    await page.locator('h1').waitFor();
    // Font/paint completion avoids checking temporary fallback layout.
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
