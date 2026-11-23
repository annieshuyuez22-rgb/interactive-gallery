import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { ffmpegPath } from './ffmpeg.mjs';

const FPS = 30;
const DURATION = 40;
const directory = new URL('../recordings/', import.meta.url).pathname;
const output = process.env.RECORD_OUTPUT ?? `${directory}Kimi-K3.1-Pro.mp4`;
const frames = process.env.RECORD_FRAMES ?? `${directory}frames-kimi/`;
fs.mkdirSync(frames, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:4173/?record=1', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__bottledSea?.ready, { timeout: 60000 });
await new Promise((resolve) => setTimeout(resolve, 2000));
const started = Date.now();
for (let frame = 0; frame < FPS * DURATION; frame++) {
  const time = frame / FPS;
  await page.evaluate((t) => window.__bottledSea.renderFrame(t), time);
  await page.screenshot({ path: `${frames}f${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94, optimizeForSpeed: true });
  if (frame % 60 === 0) console.log(`frame=${frame}/1200 elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`);
}
await browser.close();
if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
const encode = spawnSync(ffmpegPath(), [
  '-y', '-framerate', String(FPS), '-i', `${frames}f%05d.jpg`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an', '-t', String(DURATION), output,
], { stdio: 'inherit' });
if (encode.status !== 0) throw new Error(`ffmpeg exited with ${encode.status}`);
console.log(`Created ${output} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
