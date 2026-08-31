import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// Compare the rendered cascade with the pre-refactor debug revision, not a
// second copy of today's CSS. Keep the reference available in the git checkout.
const root = fileURLToPath(new URL('../../', import.meta.url));
const ref = process.env.CSS_BASE_REF || '755437d05bd5ceee25f4c0d18f2b565f9d249105';
const files = ['styles.css', 'site-shell.css', 'site-runtime-v12.css', 'polish-v9.css', 'player-v2.css', 'mixer-controls-v14.css', 'mobile-android-shell-v1.css', 'display-tools-v1.css'];
const baseline = new Map(files.map(name => [name, execFileSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/').replace(/\/$/, '')}`, 'show', `${ref}:web/${name}`], { cwd: root, encoding: 'utf8' })]));
const executablePath = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && fs.existsSync(path));
assert(executablePath, 'Set CHROME_PATH to a Chromium browser');
const base = (process.env.WEB_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const artifacts = process.env.CSS_ARTIFACT_DIR;
if (artifacts) fs.mkdirSync(artifacts, { recursive: true });

async function snapshot(page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  return page.evaluate(() => {
    const properties = ['display', 'position', 'width', 'height', 'color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight', 'line-height', 'padding', 'margin', 'border', 'border-radius', 'box-shadow', 'gap', 'align-items', 'justify-content', 'flex-direction', 'overflow-x', 'overflow-y'];
    return [...document.body.querySelectorAll('*')].filter(el => el.getClientRects().length && !el.closest('svg')).map(el => {
      const css = getComputedStyle(el);
      const values = Object.fromEntries(properties.map(key => [key, css.getPropertyValue(key)]));
      if (css.display.includes('grid')) values.columns = css.gridTemplateColumns;
      return { tag: el.tagName, id: el.id, classes: el.className, values };
    });
  });
}

async function capture(width, theme, colorScheme, before, path = '/player/') {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: 'ko-KR', colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.route('**/api/visitors', route => route.fulfill({ json: { available: false } }));
    if (before) await page.route('**/*.css*', route => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      return baseline.has(name) ? route.fulfill({ contentType: 'text/css', body: baseline.get(name) }) : route.continue();
    });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const result = {};
    if (path === '/player/') {
      const nav = page.locator(width > 900 ? '.desktop-rail' : '.mobile-tabs');
      const go = view => nav.locator(width > 900 ? `[data-view="${view}"]` : `[data-android-dest="${({ scene: 'scenes', simple: 'prepared' })[view] || view}"]`).click();
      await go('settings');
      await page.locator('#themeSelect').selectOption(theme);
      // Allow the existing theme transition to finish before sampling colors.
      await page.waitForTimeout(250);
      result.settings = await snapshot(page);
      await go('scene');
      result.journey = await snapshot(page);
      if (width <= 900) {
        await page.locator('.mobile-macros summary').click();
        result.macros = await snapshot(page);
        await page.locator('.mobile-macros summary').click();
      } else {
        await page.locator('.journey-background-toggle').click();
        result.backgroundOff = await snapshot(page);
        await page.locator('.journey-background-toggle').click();
      }
      if (artifacts && [390, 1440].includes(width)) await page.screenshot({ path: `${artifacts}/${width}-${theme}-${colorScheme}-${before ? 'before' : 'after'}.png`, fullPage: true, animations: 'disabled' });
      await go('mixer');
      result.mixer = await snapshot(page);
      if (width <= 900) { await go('simple'); result.simple = await snapshot(page); }
    } else result.page = await snapshot(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow at ${width}`);
    return result;
  } finally { await context.close(); }
}

try {
  for (const width of [390, 768, 1024, 1440]) {
    for (const [theme, scheme] of [['dark', 'light'], ['light', 'dark'], ['system', 'light'], ['system', 'dark']]) {
      assert.deepEqual(await capture(width, theme, scheme, false), await capture(width, theme, scheme, true), `${width} ${theme}/${scheme}`);
      console.log(`Unchanged cascade: ${width}px ${theme}/${scheme}`);
    }
  }
  for (const width of [380, 620, 900, 901, 1180, 1181]) {
    assert.deepEqual(await capture(width, 'system', 'light', false), await capture(width, 'system', 'light', true), `Boundary ${width}`);
    console.log(`Unchanged boundary: ${width}px`);
  }
  for (const path of ['/', '/about/', '/contact/', '/privacy/', '/terms/', '/credits/', '/download/', '/blackout/', '/404.html']) {
    for (const scheme of ['light', 'dark']) {
      assert.deepEqual(await capture(390, 'system', scheme, false, path), await capture(390, 'system', scheme, true, path), `${path} ${scheme}`);
    }
    console.log(`Unchanged page: ${path}`);
  }
} finally { await browser.close(); }
