import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const output = new URL('../recordings/qc/', import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__bottledSea?.ready);
await new Promise((resolve) => setTimeout(resolve, 2400));
const diagnostics = () => page.evaluate(() => window.__bottledSea.diagnostics());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pass = (name, detail = true) => { checks.push({ name, result: 'pass', detail }); console.log('PASS', name, typeof detail === 'object' ? JSON.stringify(detail) : detail); };

await page.click('[data-weather="storm"]');
await wait(1800);
let state = await diagnostics();
assert.equal(state.weather, 'storm');
assert.ok(state.waterAmplitude > 1.4);
pass('Storm changes waves and lighting', { amplitude: state.waterAmplitude });

await page.$eval('#time-slider', (element) => { element.value = '22'; element.dispatchEvent(new Event('input', { bubbles: true })); });
assert.equal(await page.$eval('#time-output', (element) => element.textContent), '22:00');
await page.click('#auto-cycle');
const hourBefore = (await diagnostics()).timeOfDay;
await wait(1300);
state = await diagnostics();
assert.ok(state.autoCycle && state.timeOfDay > hourBefore);
await page.click('#auto-cycle');
pass('Time slider and automatic day/night cycle');

for (const action of ['fire', 'dolphins', 'barrel', 'shake']) {
  for (let i = 0; i < 6; i++) await page.click(`[data-action="${action}"]`);
}
await wait(500);
const beforePools = await diagnostics();
for (const action of ['fire', 'dolphins', 'barrel', 'shake']) {
  for (let i = 0; i < 6; i++) await page.click(`[data-action="${action}"]`);
}
await wait(250);
state = await diagnostics();
assert.equal(state.geometries, beforePools.geometries);
assert.ok(await page.$eval('#log-entries', (element) => element.children.length <= 4));
pass('24 repeated event triggers keep fixed object pools', { geometries: state.geometries, logEntries: await page.$eval('#log-entries', (element) => element.children.length) });

await page.click('#reset');
await wait(1200);
const cameraBeforeBottle = (await diagnostics()).camera;
await page.mouse.move(710, 390);
await page.mouse.down();
await page.mouse.move(815, 410, { steps: 12 });
await page.mouse.up();
await wait(120);
state = await diagnostics();
assert.ok(Math.abs(state.bottleAngle) > 0.005);
assert.deepEqual(state.camera, cameraBeforeBottle);
pass('Bottle drag rocks bottle without moving camera', { angle: state.bottleAngle });

const cameraBeforeOrbit = (await diagnostics()).camera;
await page.mouse.move(65, 430);
await page.mouse.down();
await page.mouse.move(185, 460, { steps: 12 });
await page.mouse.up();
await wait(600);
state = await diagnostics();
assert.notDeepEqual(state.camera, cameraBeforeOrbit);
pass('Background drag orbits camera');

await page.click('#reset');
await wait(1200);
await page.mouse.click(690, 455);
await wait(250);
assert.ok(await page.$eval('#log-entries', (element) => element.textContent.includes('ripple')));
pass('Ocean click creates a ripple');

const cameraBeforeZoom = (await diagnostics()).camera;
await page.mouse.move(90, 500);
await page.mouse.wheel({ deltaY: -360 });
await wait(700);
assert.notDeepEqual((await diagnostics()).camera, cameraBeforeZoom);
pass('Mouse wheel zooms the scene');

await page.click('#quality-toggle');
assert.equal((await diagnostics()).quality, 'eco');
await page.click('#motion-toggle');
assert.equal((await diagnostics()).reducedMotion, true);
await page.click('#log-toggle');
assert.ok(await page.$eval('#log-panel', (element) => element.classList.contains('collapsed')));
pass('Quality, reduced-motion and log controls');
await page.click('#reset');
await wait(700);
await page.screenshot({ path: `${output}interactive-desktop.png` });

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));
await mobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
await mobile.waitForFunction(() => window.__bottledSea?.ready);
await wait(1800);
assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
await mobile.tap('#log-toggle');
assert.ok(await mobile.$eval('#log-panel', (element) => element.classList.contains('expanded')));
await mobile.tap('[data-weather="calm"]');
assert.equal(await mobile.evaluate(() => window.__bottledSea.diagnostics().weather), 'calm');
await mobile.tap('[data-action="dolphins"]');
await wait(700);
await mobile.tap('#log-toggle');
await mobile.screenshot({ path: `${output}interactive-mobile.png` });
pass('390px touch layout and controls');
assert.deepEqual(errors, []);
pass('No browser runtime errors', errors);
fs.writeFileSync(`${output}verification.json`, JSON.stringify({ checks, errors }, null, 2));
await browser.close();
