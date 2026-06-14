// library.js — download a chosen video and file it into a tidy library.
//
// Layout produced (Jellyfin/Plex-friendly):
//   library/
//     Night of the Living Dead (1968)/
//       Night of the Living Dead (1968).mp4
//       poster.jpg
//       metadata.json
//
// The download streams to a .part file and is atomically renamed on success,
// so an interrupted run never leaves a half-file masquerading as complete.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * @param {object} opts
 * @param {object} opts.item   result of archive.getItem()
 * @param {object} opts.video  chosen video rendition ({name,url,size,height,...})
 * @param {string} opts.libraryDir root of the library on disk
 * @param {(p:{received:number,total:number})=>void} [opts.onProgress]
 * @returns {Promise<{folder:string, file:string}>}
 */
export async function downloadToLibrary({ item, video, libraryDir, onProgress }) {
  const titleYear = formatTitleYear(item.title, item.year);
  const safeName = sanitizeFilename(titleYear);
  const folder = path.join(libraryDir, safeName);
  await fsp.mkdir(folder, { recursive: true });

  const ext = path.extname(video.name) || '.mp4';
  const finalPath = path.join(folder, `${safeName}${ext}`);
  const partPath = `${finalPath}.part`;

  // Stream the video to disk with progress reporting.
  const res = await fetch(video.url, {
    headers: { 'User-Agent': 'media-fetcher (legal public-domain library tool)' },
  });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }

  const total = Number(res.headers.get('content-length')) || video.size || 0;
  let received = 0;

  const source = Readable.fromWeb(res.body);
  if (onProgress) {
    source.on('data', (chunk) => {
      received += chunk.length;
      onProgress({ received, total });
    });
  }

  await pipeline(source, fs.createWriteStream(partPath));
  await fsp.rename(partPath, finalPath); // atomic: only "appears" when complete

  // Best-effort poster + metadata sidecar; never fail the whole job over these.
  await savePoster(item, folder).catch(() => {});
  await saveMetadata(item, video, folder, finalPath).catch(() => {});

  return { folder, file: finalPath };
}

async function savePoster(item, folder) {
  if (!item.poster) return;
  const res = await fetch(item.poster, {
    headers: { 'User-Agent': 'media-fetcher (legal public-domain library tool)' },
  });
  if (!res.ok || !res.body) return;
  const ext = path.extname(new URL(item.poster).pathname) || '.jpg';
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(path.join(folder, `poster${ext}`)));
}

async function saveMetadata(item, video, folder, finalPath) {
  const metadata = {
    title: item.title,
    year: item.year,
    description: item.description,
    source: 'Internet Archive (archive.org)',
    identifier: item.identifier,
    sourceUrl: `https://archive.org/details/${item.identifier}`,
    license: 'See source page — items here are public domain or Creative Commons.',
    file: path.basename(finalPath),
    resolution: video.height ? `${video.height}p` : 'unknown',
    fetchedAt: new Date().toISOString(),
  };
  await fsp.writeFile(path.join(folder, 'metadata.json'), JSON.stringify(metadata, null, 2));
}

export function formatTitleYear(title, year) {
  const t = String(title || 'Unknown').trim();
  return year ? `${t} (${year})` : t;
}

// Strip characters that are illegal/awkward in file names across OSes.
export function sanitizeFilename(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'Untitled';
}
