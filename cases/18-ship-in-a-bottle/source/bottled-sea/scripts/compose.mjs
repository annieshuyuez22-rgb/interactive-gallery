import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { ffmpegPath } from './ffmpeg.mjs';

const directory = new URL('../recordings/', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 3840, height: 2160, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(`file://${new URL('../compare.html', import.meta.url).pathname}?background=1`, { waitUntil: 'networkidle0' });
await new Promise((resolve) => setTimeout(resolve, 1200));
await page.screenshot({ path: `${directory}comparison-background.png` });
await browser.close();
const ffmpeg = ffmpegPath();
const compose = spawnSync(ffmpeg, [
  '-y', '-stream_loop', '-1', '-i', `${directory}Kimi-K3.1-Pro.mp4`, '-i', `${directory}GPT6-Astra.mp4`, '-framerate', '30', '-loop', '1', '-i', `${directory}comparison-background.png`,
  '-filter_complex', '[0:v]scale=1792:1008:flags=lanczos,setpts=PTS-STARTPTS[left];[1:v]scale=1792:1008:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,setpts=PTS-STARTPTS[right];[2:v]setpts=PTS-STARTPTS[bg];[bg][left]overlay=96:584:eof_action=repeat[withLeft];[withLeft][right]overlay=1952:584:eof_action=repeat,fps=30,format=yuv420p[out]',
  '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', '-an', '-t', '40', `${directory}Kimi-K3.1-Pro_vs_GPT6-Astra.mp4`,
], { stdio: 'inherit' });
if (compose.status !== 0) throw new Error(`ffmpeg exited with ${compose.status}`);
const poster = spawnSync(ffmpeg, ['-y', '-i', `${directory}Kimi-K3.1-Pro_vs_GPT6-Astra.mp4`, '-frames:v', '1', '-q:v', '2', `${directory}Kimi-K3.1-Pro-poster.jpg`], { stdio: 'inherit' });
if (poster.status !== 0) throw new Error(`Poster export exited with ${poster.status}`);
console.log(`Created ${directory}Kimi-K3.1-Pro_vs_GPT6-Astra.mp4`);
