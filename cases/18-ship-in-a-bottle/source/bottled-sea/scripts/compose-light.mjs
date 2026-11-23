import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { ffmpegPath } from './ffmpeg.mjs';

const directory = new URL('../recordings/', import.meta.url).pathname;
const output = process.env.LIGHT_OUTPUT ?? `${directory}Kimi-K3.1-Pro_vs_GPT6-Astra-light.mp4`;
const leftVideo = process.env.LIGHT_LEFT_VIDEO ?? `${directory}Kimi-K3.1-Pro.mp4`;
const rightVideo = process.env.LIGHT_RIGHT_VIDEO ?? `${directory}GPT6-Astra.mp4`;
const rightLabel = process.env.LIGHT_RIGHT_LABEL ?? 'GPT6-Astra';
const leftLabel = process.env.LIGHT_LEFT_LABEL ?? 'Kimi K3.1 Pro';
const rightLogo = process.env.LIGHT_RIGHT_LOGO ?? (rightLabel.includes('K3') ? 'assets/kimi-icon.png' : 'assets/openai.svg');
const rightLoop = process.env.LIGHT_RIGHT_LOOP === '1';
const poster = output.replace(/\.mp4$/, '-poster.jpg');
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 3840, height: 2160, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(`file://${new URL('../compare-light.html', import.meta.url).pathname}?background=1`, { waitUntil: 'networkidle0' });
await page.evaluate(({ leftLabel, rightLabel, rightLogo }) => {
  document.querySelector('#left-name').textContent = leftLabel;
  document.querySelector('#right-name').textContent = rightLabel;
  const logo = document.querySelector('#right-logo');
  logo.src = rightLogo;
  logo.classList.toggle('vector', rightLogo.endsWith('.svg'));
}, { leftLabel, rightLabel, rightLogo });
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 500));
await page.screenshot({ path: `${directory}comparison-light-background.png` });
await browser.close();
const ffmpeg = ffmpegPath();
const rightInput = rightLoop ? ['-stream_loop', '-1'] : [];
const rightFilter = rightLoop
  ? '[1:v]scale=1792:1008:flags=lanczos,trim=duration=40,setpts=PTS-STARTPTS[right]'
  : '[1:v]scale=1792:1008:flags=lanczos,tpad=stop_mode=clone:stop_duration=40,trim=duration=40,setpts=PTS-STARTPTS[right]';
const compose = spawnSync(ffmpeg, [
  '-y', '-stream_loop', '-1', '-i', leftVideo, ...rightInput, '-i', rightVideo, '-framerate', '30', '-loop', '1', '-i', `${directory}comparison-light-background.png`,
  '-filter_complex', `[0:v]scale=1792:1008:flags=lanczos,setpts=PTS-STARTPTS[left];${rightFilter};[2:v]setpts=PTS-STARTPTS[bg];[bg][left]overlay=96:584:eof_action=repeat[withLeft];[withLeft][right]overlay=1952:584:eof_action=repeat,fps=30,format=yuv420p[out]`,
  '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', '-an', '-t', '40', output,
], { stdio: 'inherit' });
if (compose.status !== 0) throw new Error(`ffmpeg exited with ${compose.status}`);
const posterResult = spawnSync(ffmpeg, ['-y', '-i', output, '-frames:v', '1', '-q:v', '2', poster], { stdio: 'inherit' });
if (posterResult.status !== 0) throw new Error(`Poster export exited with ${posterResult.status}`);
console.log(`Created ${output}`);
