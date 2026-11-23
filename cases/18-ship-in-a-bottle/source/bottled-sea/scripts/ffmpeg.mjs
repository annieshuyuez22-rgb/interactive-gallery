import { execFileSync } from 'node:child_process';

export function ffmpegPath() {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  try {
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
  } catch {
    return 'ffmpeg';
  }
}
