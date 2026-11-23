import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const output = new URL('../recordings/qc/', import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('requestfailed', (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
await page.goto('http://127.0.0.1:4173/?record=1', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__bottledSea?.ready, { timeout: 60000 });
await new Promise((resolve) => setTimeout(resolve, 2200));
for (const [name, time] of [['day', 0], ['close', 9.8], ['storm', 23], ['night', 28.8], ['morning', 39.5]]) {
  const diagnostics = await page.evaluate((t) => window.__bottledSea.renderFrame(t), time);
  await page.screenshot({ path: `${output}${name}.png` });
  console.log(name, JSON.stringify(diagnostics));
}
console.log('errors', JSON.stringify(errors));
await browser.close();
