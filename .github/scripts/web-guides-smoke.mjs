import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const routes = ['guide', 'journeys', 'sound-design', 'sleep-and-meditation', 'help'];
const executablePath = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && fs.existsSync(path));
const base = process.env.WEB_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: width === 390 ? 'light' : 'dark', locale: 'ko-KR', serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of routes) {
      await page.goto(`${base}/${route}/`);
      await page.evaluate(() => localStorage.setItem('lullaby-language', 'ko'));
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
      assert.equal(await page.locator('h1:visible').count(), 1);
      assert(await page.evaluate(() => {
        const rgb = text => text.match(/[\d.]+/g).slice(0, 3).map(Number);
        const luminance = text => rgb(text).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const fg = luminance(getComputedStyle(document.querySelector('h1')).color);
        const bg = luminance(getComputedStyle(document.body, '::before').backgroundColor);
        return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) >= 4.5;
      }), 'Reading contrast matches the system theme');
      await page.getByRole('button', { name: 'Read in English' }).click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('h1:visible').count(), 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: mobile overflow`);
      for (const href of await page.locator('a[href^="#"]:visible').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
        assert.equal(await page.locator(href).count(), 1, `${route}: valid anchor ${href}`);
      }
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Language survives reload');
      await page.evaluate(() => localStorage.setItem('lullaby-language', 'ar'));
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Editorial fallback is explicit English');
      assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
    }
    assert.deepEqual(errors, [], 'No JavaScript exceptions');
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(`${base}/${route}/`);
    assert.equal(await page.locator('h1:visible').count(), 1, 'Readable without JavaScript');
    assert(await page.locator('main section:visible').count() >= 6);
  }
  await context.close();
  const listening = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', serviceWorkers: 'block' });
  const player = await listening.newPage();
  const ids = ['passenger_aircraft_cabin','train_journey','spacecraft_journey','ferry_journey','submarine_journey','forest_temple_journey','hood_journey'];
  for (const id of ids) {
    await player.goto(`${base}/player/?scene=journey&journey=${id}`);
    assert.equal(await player.locator('#journeySelector .active').getAttribute('data-journey'), id, 'Guide opens the requested journey');
    assert.equal(await player.evaluate(() => scenePlaying), false, 'A link never starts playback');
  }
  await player.locator('[data-journey="train_journey"]').click();
  await player.reload();
  assert.equal(await player.locator('#journeySelector .active').getAttribute('data-journey'), 'train_journey', 'Selection is reflected in the URL');
  await player.goto(`${base}/player/?journey=unknown%22%5D`);
  assert.equal(await player.locator('#journeySelector .active').getAttribute('data-journey'), 'passenger_aircraft_cabin', 'Unknown IDs keep the default');
  await player.goto(`${base}/player/?scene=simple&journey=hood_journey`);
  assert.equal(await player.locator('#simpleSceneTab').getAttribute('aria-selected'), 'true', 'Explicit simple mode takes precedence');
  await player.goto(`${base}/sound-design/`);
  await player.evaluate(() => localStorage.setItem('lullaby-language', 'ko'));
  await player.reload();
  assert.equal(await player.locator('audio:visible').count(), 2);
  await player.locator('audio:visible').first().evaluate(audio => audio.play());
  await player.locator('audio:visible').last().evaluate(audio => audio.play());
  assert.equal(await player.locator('audio:visible').first().evaluate(audio => audio.paused), true, 'Listening examples do not overlap');
  await player.getByRole('button', { name: 'Read in English' }).click();
  assert.equal(await player.locator('audio').evaluateAll(audios => audios.every(audio => audio.paused)), true, 'Language changes do not leave hidden audio playing');
  await player.goto(base + '/');
  assert.equal(await player.locator('.place-entry').count(), 7);
  await player.evaluate(() => window.LullabyLocales.setLanguage('en'));
  assert.equal((await player.locator('.hero h1').innerText()).replace(/\s+/g, ' '), 'Choose a place. Stay for a while.');
  await player.evaluate(() => window.LullabyLocales.setLanguage('ko'));
  assert.equal((await player.locator('.hero h1').innerText()).replace(/\s+/g, ' '), '잠들기 전, 소리로 고르는 장소.');
  await player.evaluate(() => window.LullabyLocales.setLanguage('ar'));
  assert.equal((await player.locator('.hero h1').innerText()).trim(), await player.evaluate(() => window.LullabyLocales.t('heroTitle')), 'Existing localized home titles remain available');
  await player.evaluate(() => window.LullabyLocales.setLanguage('ko'));
  assert.equal((await player.locator('.hero h1').innerText()).replace(/\s+/g, ' '), '잠들기 전, 소리로 고르는 장소.', 'Switching back restores both title lines');
  await listening.close();
  console.log('Five guides: mobile/desktop, KO/EN, saved language, RTL fallback, anchors and no-JS verified.');
} finally { await browser.close(); }
