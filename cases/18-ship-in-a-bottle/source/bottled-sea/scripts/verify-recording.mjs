import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const output = new URL('../recordings/qc/', import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:4173/?record=1', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__bottledSea?.ready);
await new Promise((resolve) => setTimeout(resolve, 2000));
const render = (time) => page.evaluate((t) => window.__bottledSea.renderFrame(t), time);
await render(0);
const initial = await page.screenshot({ path: `${output}deterministic-initial.png` });
const initialCamera = (await render(0)).camera;
[18, 12.2, 36].forEach((value, index) => assert.ok(Math.abs(initialCamera[index] - value) < 1e-9));
console.log('PASS First frame uses the intended camera');

const threshold = await render(20.7);
assert.equal(threshold.weather, 'storm');
assert.ok(Math.abs(threshold.demoTime - 20.7) < 0.0001);
console.log('PASS Storm begins at exactly 20.7 seconds');
await render(23);
await render(0);
const reset = await page.screenshot({ path: `${output}deterministic-reset.png` });
assert.ok(initial.equals(reset), 'Frame zero differs after a backward seek');
console.log('PASS Backward seek restores frame zero pixel-for-pixel');

await render(9.8);
const sequential = await page.screenshot({ path: `${output}deterministic-sequential.png` });
await render(28.2);
await render(9.8);
const repeated = await page.screenshot({ path: `${output}deterministic-repeated.png` });
assert.ok(sequential.equals(repeated), 'Repeated seek differs at 9.8 seconds');
console.log('PASS Repeated recording is pixel-identical at 9.8 seconds');

await render(20.7);
const stormInitial = await page.screenshot({ path: `${output}deterministic-storm-initial.png` });
await render(40);
await render(20.7);
const stormRepeated = await page.screenshot({ path: `${output}deterministic-storm-repeated.png` });
assert.ok(stormInitial.equals(stormRepeated), 'Storm differs after a complete 40-second replay');
console.log('PASS Storm is pixel-identical after a complete 40-second replay');
assert.deepEqual(errors, []);
console.log('PASS No browser runtime errors');
await browser.close();
