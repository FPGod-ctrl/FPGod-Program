// archive.js — talk to the Internet Archive's public API.
//
// The Internet Archive (archive.org) hosts a large, legal catalogue of
// public-domain and Creative-Commons films. Everything here uses their
// documented, key-free public endpoints:
//   - advancedsearch.php  -> find matching items
//   - metadata/<id>       -> list the files inside an item
//   - download/<id>/<f>   -> fetch an individual file
//
// No scraping, no private trackers — just open data.

const SEARCH_URL = 'https://archive.org/advancedsearch.php';
const METADATA_URL = 'https://archive.org/metadata';
const DOWNLOAD_URL = 'https://archive.org/download';

// Video container extensions we know how to play, best-effort ordered by how
// commonly they carry a clean high-quality encode.
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.ogv', '.avi', '.mov', '.m4v'];

/**
 * Search the Internet Archive's movie collection for a title.
 * @param {string} query free-text movie title
 * @param {number} rows max results to return
 * @returns {Promise<Array<{identifier:string,title:string,year:string,description:string}>>}
 */
export async function searchMovies(query, rows = 8) {
  const q = `(${escapeQuery(query)}) AND mediatype:(movies)`;
  const params = new URLSearchParams({
    q,
    rows: String(rows),
    page: '1',
    output: 'json',
  });
  // fl[] is repeated, one per field we want back.
  for (const field of ['identifier', 'title', 'year', 'description', 'downloads']) {
    params.append('fl[]', field);
  }
  // Most-downloaded first — a decent proxy for "the version people actually want".
  params.append('sort[]', 'downloads desc');

  const url = `${SEARCH_URL}?${params.toString()}`;
  const res = await fetchJson(url);
  const docs = res?.response?.docs ?? [];
  return docs.map((d) => ({
    identifier: d.identifier,
    title: typeof d.title === 'string' ? d.title : String(d.title ?? d.identifier),
    year: d.year ? String(d.year) : '',
    description: cleanDescription(d.description),
    downloads: Number(d.downloads ?? 0),
  }));
}

/**
 * Fetch the file list + metadata for an item, and choose the best video file.
 * @param {string} identifier archive.org item id
 * @returns {Promise<{
 *   identifier:string, title:string, year:string, description:string,
 *   poster:string|null,
 *   best:{name:string, size:number, height:number, format:string, url:string}|null,
 *   videos:Array
 * }>}
 */
export async function getItem(identifier) {
  const meta = await fetchJson(`${METADATA_URL}/${encodeURIComponent(identifier)}`);
  const files = Array.isArray(meta.files) ? meta.files : [];
  const m = meta.metadata ?? {};

  const videos = files
    .filter((f) => isVideoFile(f.name))
    .map((f) => ({
      name: f.name,
      size: Number(f.size ?? 0),
      height: parseHeight(f),
      format: f.format ?? '',
      url: `${DOWNLOAD_URL}/${encodeURIComponent(identifier)}/${encodePath(f.name)}`,
    }));

  const best = pickBestVideo(videos);

  // A thumbnail/poster if the item ships one.
  const posterFile = files.find((f) => /\.(jpg|jpeg|png)$/i.test(f.name) && !/_thumb/i.test(f.name));
  const poster = posterFile
    ? `${DOWNLOAD_URL}/${encodeURIComponent(identifier)}/${encodePath(posterFile.name)}`
    : null;

  return {
    identifier,
    title: firstString(m.title) || identifier,
    year: firstString(m.year) || firstString(m.date) || '',
    description: cleanDescription(m.description),
    poster,
    best,
    videos,
  };
}

/**
 * Of all the video renditions in an item, choose the "best": highest vertical
 * resolution wins, file size breaks ties (bigger ~ higher bitrate).
 */
export function pickBestVideo(videos) {
  if (!videos.length) return null;
  return [...videos].sort((a, b) => {
    if (b.height !== a.height) return b.height - a.height;
    return b.size - a.size;
  })[0];
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function isVideoFile(name = '') {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Archive metadata sometimes exposes a "height" field; otherwise we sniff the
// filename for a resolution tag like 720p / 1080 / 480.
function parseHeight(file) {
  if (file.height) {
    const h = parseInt(file.height, 10);
    if (!Number.isNaN(h)) return h;
  }
  const m = String(file.name).match(/(\d{3,4})p?\b/);
  if (m) {
    const h = parseInt(m[1], 10);
    // Guard against matching years or random numbers — real heights live here.
    if (h >= 144 && h <= 4320) return h;
  }
  return 0;
}

function escapeQuery(q) {
  // Strip characters that have special meaning in the Lucene-style query syntax.
  return String(q).replace(/[:"(){}[\]^~*?\\]/g, ' ').trim();
}

function firstString(v) {
  if (Array.isArray(v)) return v.length ? String(v[0]) : '';
  return v == null ? '' : String(v);
}

function cleanDescription(v) {
  const s = firstString(v);
  // Descriptions often contain HTML; flatten to plain-ish text and trim length.
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);
}

// archive.org file names can contain slashes/spaces; encode each path segment.
function encodePath(name) {
  return String(name)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'media-fetcher (legal public-domain library tool)' },
  });
  if (!res.ok) {
    throw new Error(`Internet Archive request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export { DOWNLOAD_URL };
