import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const LEGACY_DIR = path.join(process.cwd(), 'asdjklhfskjafhakfhueoyraehfjkcnjkdscnsjakdreuoiwefh');
const DATA_DIR = path.join(LEGACY_DIR, 'data');

const CACHE_FILES = [
  {
    file: path.join(process.cwd(), 'cachegame.json'),
    baseUrl: 'https://raw.githack.com/sebastian-92/game-assets/fixy',
    source: '~pegleg/3kh0',
  },
  {
    file: path.join(process.cwd(), 'selcache.json'),
    baseUrl: 'https://rawcdn.githack.com/sebastian-92/selenite1/f648efb8d13961a0042118584248e38d77d2f603',
    source: '~selenite',
  },
  {
    file: path.join(process.cwd(), 'nativecache.json'),
    baseUrl: 'https://rawcdn.githack.com/Parcoil/nativegames.net-v1/ddc2ed3c55332113d036e137db0befa48da98c9b',
    source: '~native',
  },
];

// Shared in-memory cache so the large game index is built once per server instance.
// It is intentionally only invalidated on server restart; this trades memory for speed and avoids
// rebuilding/parsing the full preserved catalog on every search request.
let cachedIndexPromise = null;

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function addResult(index, title, href, source) {
  const cleanedTitle = title.replace(/\+/g, ' ').trim();
  if (!cleanedTitle || !href) return;
  index.push({
    title: cleanedTitle,
    titleLower: cleanedTitle.toLowerCase(),
    href,
    source,
  });
}

async function loadSourceJsonIndex() {
  const index = [];
  const sourcesRaw = await fs.readFile(path.join(DATA_DIR, 'sources.json'), 'utf8');
  const sourceFiles = JSON.parse(sourcesRaw);

  for (const sourceFile of sourceFiles) {
    const filePath = path.join(LEGACY_DIR, sourceFile);
    const sourcePayload = JSON.parse(await fs.readFile(filePath, 'utf8'));

    for (const item of sourcePayload.data || []) {
      let name = item;
      for (const removeItem of sourcePayload.remove || []) {
        if (sourcePayload.regex) {
          name = name.replace(new RegExp(removeItem), '');
        } else {
          name = name.replace(removeItem, '');
        }
      }

      addResult(
        index,
        safeDecode(name),
        `/legacy/${sourcePayload.playerurl}${item}`,
        sourcePayload.name || sourceFile.replace('data/', '').replace('.json', '')
      );
    }
  }

  return index;
}

async function loadCacheIndex() {
  const index = [];

  for (const cache of CACHE_FILES) {
    const payload = JSON.parse(await fs.readFile(cache.file, 'utf8'));
    for (const item of payload) {
      if (item.type !== 'dir') continue;
      addResult(index, (item.name || '').replace(/-/g, ' '), `${cache.baseUrl}/${item.path}/index.html`, cache.source);
    }
  }

  return index;
}

async function loadIndex() {
  if (!cachedIndexPromise) {
    cachedIndexPromise = Promise.all([loadSourceJsonIndex(), loadCacheIndex()])
      .then(([sourceIndex, cacheIndex]) => [
        ...sourceIndex,
        ...cacheIndex,
      ])
      .catch((error) => {
        cachedIndexPromise = null;
        throw error;
      });
  }
  return cachedIndexPromise;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const source = (searchParams.get('source') || 'all').trim().toLowerCase();

  const index = await loadIndex();

  let filtered = index;
  if (source !== 'all') {
    filtered = filtered.filter((game) => game.source.toLowerCase() === source);
  }
  if (query) {
    filtered = filtered.filter((game) => game.titleLower.includes(query));
  }

  return NextResponse.json({
    total: filtered.length,
    results: filtered.slice(0, 300).map(({ title, href, source: gameSource }) => ({
      title,
      href,
      source: gameSource,
    })),
  });
}
