import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const output = new URL('../recordings/qc/soak.json', import.meta.url).pathname;
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
await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:4175'}/`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__bottledSea?.ready);
await new Promise((resolve) => setTimeout(resolve, 2200));
for (const action of ['fire', 'dolphins', 'barrel', 'shake']) {
  for (let i = 0; i < 6; i++) await page.click(`[data-action="${action}"]`);
}
await new Promise((resolve) => setTimeout(resolve, 1000));
const baseline = await page.evaluate(() => window.__bottledSea.diagnostics());
const samples = [];
const started = Date.now();
let iteration = 0;
while (Date.now() - started < 600000) {
  const action = ['fire', 'dolphins', 'barrel', 'shake'][iteration % 4];
  await page.click(`[data-action="${action}"]`);
  if (iteration % 8 === 0) await page.click(`[data-weather="${['calm', 'breeze', 'storm'][iteration / 8 % 3 | 0]}"]`);
  if (iteration % 15 === 0) await page.$eval('#time-slider', (element) => { element.value = String((Math.random() * 24).toFixed(2)); element.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const sample = await page.evaluate(() => ({
    at: Date.now(),
    diagnostics: window.__bottledSea.diagnostics(),
    fps: document.querySelector('#fps-readout').textContent,
    logEntries: document.querySelector('#log-entries').children.length,
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));
  samples.push(sample);
  if (iteration % 15 === 0) fs.writeFileSync(output, JSON.stringify({ status: 'running', elapsedSeconds: (Date.now() - started) / 1000, baseline, samples, errors }, null, 2));
  iteration++;
}
const fpsValues = samples.map((sample) => Number.parseInt(sample.fps)).filter((value) => Number.isFinite(value) && value > 0);
const result = {
  status: errors.length ? 'failed' : 'completed',
  durationSeconds: (Date.now() - started) / 1000,
  eventTriggers: iteration,
  baseline,
  geometryRange: [Math.min(...samples.map((sample) => sample.diagnostics.geometries)), Math.max(...samples.map((sample) => sample.diagnostics.geometries))],
  textureRange: [Math.min(...samples.map((sample) => sample.diagnostics.textures)), Math.max(...samples.map((sample) => sample.diagnostics.textures))],
  fps: { average: fpsValues.reduce((sum, value) => sum + value, 0) / fpsValues.length, minimum: Math.min(...fpsValues), maximum: Math.max(...fpsValues) },
  heapRange: samples.every((sample) => sample.heap === null) ? null : [Math.min(...samples.map((sample) => sample.heap)), Math.max(...samples.map((sample) => sample.heap))],
  maxLogEntries: Math.max(...samples.map((sample) => sample.logEntries)),
  errors,
  samples,
};
fs.writeFileSync(output, JSON.stringify(result, null, 2));
await page.screenshot({ path: new URL('../recordings/qc/soak-final.png', import.meta.url).pathname });
await browser.close();
console.log(JSON.stringify({ ...result, samples: undefined }));
