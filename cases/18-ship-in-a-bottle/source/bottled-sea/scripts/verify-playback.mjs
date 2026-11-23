import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(new URL('../compare.html', import.meta.url).href, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => ['#kimi', '#astra'].every((selector) => document.querySelector(selector)?.readyState >= 3));
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 500));
const right = await page.$('.slot-right');
assert.ok(right);
const before = await right.screenshot({ path: new URL('../recordings/qc/right-before.png', import.meta.url).pathname });
await page.evaluate(() => Promise.all([document.querySelector('#kimi').play(), document.querySelector('#astra').play()]));
await new Promise((resolve) => setTimeout(resolve, 2200));
const playing = await page.evaluate(() => ({
  kimiTime: document.querySelector('#kimi').currentTime,
  astraTime: document.querySelector('#astra').currentTime,
  kimiDuration: document.querySelector('#kimi').duration,
  astraDuration: document.querySelector('#astra').duration,
  rightVideos: document.querySelectorAll('.slot-right video').length,
}));
assert.ok(playing.kimiTime > 0 && playing.astraTime > 0);
assert.ok(Math.abs(playing.kimiTime - playing.astraTime) < 0.5);
assert.equal(playing.kimiDuration, 40);
assert.equal(playing.astraDuration, 36);
assert.equal(playing.rightVideos, 1);
await page.evaluate(() => Promise.all(['#kimi', '#astra'].map((selector) => new Promise((resolve) => {
  const video = document.querySelector(selector);
  video.controls = false;
  video.addEventListener('seeked', resolve, { once: true });
  video.currentTime = 25;
}))));
const after = await right.screenshot({ path: new URL('../recordings/qc/right-after.png', import.meta.url).pathname });
assert.ok(!before.equals(after), 'Right video did not play');
await page.screenshot({ path: new URL('../recordings/qc/comparison-playback.png', import.meta.url).pathname });
assert.deepEqual(errors, []);
console.log(JSON.stringify({ playback: 'pass', ...playing, rightSlotHasRealVideo: true, errors }));
await browser.close();
