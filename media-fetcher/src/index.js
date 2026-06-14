#!/usr/bin/env node
// media-fetcher — "tell it a movie, it lands in your library."
//
// Pulls public-domain / Creative-Commons films from the Internet Archive,
// picks the highest-quality video available, and files it into a tidy,
// Jellyfin/Plex-ready library folder.
//
// Usage:
//   node src/index.js "Night of the Living Dead"
//   node src/index.js "Nosferatu" --list          # show matches, don't download
//   node src/index.js "Nosferatu" --pick 2         # download the 2nd match
//   node src/index.js "Plan 9" --out /media/movies # custom library location
//
// Everything it reaches is free and legal to download.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchMovies, getItem } from './archive.js';
import { downloadToLibrary, formatTitleYear } from './library.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LIBRARY = path.resolve(__dirname, '..', 'library');

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.query || args.help) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const libraryDir = args.out ? path.resolve(args.out) : DEFAULT_LIBRARY;

  log(`🔎  Searching the Internet Archive for "${args.query}"…`);
  const results = await searchMovies(args.query);

  if (!results.length) {
    log('😕  No public-domain matches found. Try a different or simpler title.');
    process.exit(2);
  }

  printResults(results);

  if (args.list) {
    log('\nℹ️   --list given, stopping before download. Re-run with --pick <n> to grab one.');
    return;
  }

  const index = args.pick ? args.pick - 1 : 0;
  const chosen = results[index];
  if (!chosen) {
    log(`\n❌  --pick ${args.pick} is out of range (only ${results.length} results).`);
    process.exit(2);
  }

  log(`\n📦  Fetching details for: ${formatTitleYear(chosen.title, chosen.year)}`);
  const item = await getItem(chosen.identifier);

  if (!item.best) {
    log('❌  That item has no downloadable video file. Try --pick on another result.');
    process.exit(2);
  }

  const res = item.best;
  const qual = res.height ? `${res.height}p` : 'best available';
  log(`🎬  Selected video: ${res.name}  (${qual}, ${formatBytes(res.size)})`);
  log(`⬇️   Downloading into your library…`);

  const { file } = await downloadToLibrary({
    item,
    video: res,
    libraryDir,
    onProgress: makeProgressBar(),
  });

  process.stdout.write('\n');
  log(`✅  Done! Saved to:\n    ${file}`);
  log(`📚  Point Jellyfin/Plex at:  ${libraryDir}`);
}

// ---------------------------------------------------------------------------
// CLI plumbing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { query: '', list: false, pick: 0, out: '', help: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--pick') out.pick = parseInt(argv[++i], 10) || 0;
    else if (a === '--out') out.out = argv[++i] || '';
    else positional.push(a);
  }
  out.query = positional.join(' ').trim();
  return out;
}

function printUsage() {
  log(`media-fetcher — download free public-domain movies into a tidy library

Usage:
  node src/index.js "<movie title>"            Download the top match
  node src/index.js "<title>" --list           Show matches only (no download)
  node src/index.js "<title>" --pick <n>        Download the n-th match
  node src/index.js "<title>" --out <dir>       Choose where the library lives

All content comes from the Internet Archive and is free + legal to download.`);
}

function printResults(results) {
  log('\nMatches:');
  results.forEach((r, i) => {
    const dl = r.downloads ? `  · ${formatNumber(r.downloads)} downloads` : '';
    log(`  ${i + 1}. ${formatTitleYear(r.title, r.year)}${dl}`);
    if (r.description) log(`     ${r.description.slice(0, 120)}…`);
  });
}

// A single-line progress bar that updates in place.
function makeProgressBar() {
  let lastRender = 0;
  return ({ received, total }) => {
    const now = Date.now();
    const done = total && received >= total;
    if (now - lastRender < 100 && !done) return; // throttle redraws
    lastRender = now;

    if (total) {
      const ratio = Math.min(received / total, 1);
      const width = 28;
      const filled = Math.round(ratio * width);
      const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
      process.stdout.write(
        `\r    [${bar}] ${(ratio * 100).toFixed(0)}%  ${formatBytes(received)} / ${formatBytes(total)}   `
      );
    } else {
      process.stdout.write(`\r    Downloaded ${formatBytes(received)}…   `);
    }
  };
}

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

function log(msg) {
  // Single sink so output is easy to redirect/silence later.
  console.log(msg);
}

main().catch((err) => {
  process.stdout.write('\n');
  console.error(`💥  ${err.message}`);
  process.exit(1);
});
