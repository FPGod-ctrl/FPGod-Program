# media-fetcher

**Tell it a movie title → it finds a free, legal copy, grabs the best quality
available, and files it into a tidy library you can point Jellyfin or Plex at.**

It pulls from the [Internet Archive](https://archive.org), which hosts a large
catalogue of **public-domain and Creative-Commons films** — classics, noir,
horror, sci-fi, cartoons, and more, much of it in HD. Everything it touches is
free and legal to download.

> It does **not** touch private trackers, torrent sites, or any pirated
> content. It only uses archive.org's open, documented public API.

## Requirements

- Node.js 20+ (uses the built-in `fetch` and streams — **zero npm installs**)

## Usage

```bash
cd media-fetcher

# Download the top match
node src/index.js "Night of the Living Dead"

# Just see what's available (no download)
node src/index.js "Nosferatu" --list

# Download a specific result from the list
node src/index.js "Nosferatu" --pick 2

# Send the library somewhere specific (e.g. your media drive)
node src/index.js "Plan 9 from Outer Space" --out /media/movies
```

## What you get

```
library/
└── Night of the Living Dead (1968)/
    ├── Night of the Living Dead (1968).mp4
    ├── poster.jpg
    └── metadata.json
```

`metadata.json` records the title, year, description, source URL, and the
resolution that was downloaded — and links back to the archive.org page so the
licence is always traceable.

## How it works

1. **Search** — queries the Archive's `advancedsearch` API for `mediatype:movies`,
   sorted by popularity.
2. **Pick best quality** — reads each item's file list and chooses the highest
   vertical resolution (1080p → 720p → …), using file size to break ties.
3. **Download safely** — streams to a `.part` file with a live progress bar, then
   atomically renames on success, so you never get a half-finished file.
4. **Organize** — names the folder `Title (Year)`, saves a poster and a metadata
   sidecar — the exact layout Jellyfin and Plex expect.

## Point a media server at it

Install [Jellyfin](https://jellyfin.org) (free, self-hosted) or
[Plex](https://www.plex.tv), add a **Movies** library, and point it at the
`library/` folder above. New downloads show up automatically with artwork.

## A note on scope

This tool is deliberately limited to content that is free to download. If you
want films that aren't in the public domain, buy or rent them through a legal
service (the Archive won't have them, and that's by design).
