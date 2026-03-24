import fs from 'node:fs/promises';
import path from 'node:path';

const LEGACY_ROOT = path.join(process.cwd(), 'asdjklhfskjafhakfhueoyraehfjkcnjkdscnsjakdreuoiwefh');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
};

function getContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function resolveFile(pathParts = []) {
  const normalizedParts = pathParts.length ? pathParts : ['atlas.html'];
  if (normalizedParts.length === 1 && (normalizedParts[0] === 'index.html' || normalizedParts[0] === 'index')) {
    normalizedParts[0] = 'atlas.html';
  }

  const requestedPath = path.join(LEGACY_ROOT, ...normalizedParts);
  const normalizedPath = path.normalize(requestedPath);
  const relativePath = path.relative(LEGACY_ROOT, normalizedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  try {
    const stat = await fs.stat(normalizedPath);
    if (stat.isDirectory()) {
      return path.join(normalizedPath, 'index.html');
    }
    return normalizedPath;
  } catch {
    return null;
  }
}

export async function GET(_request, { params }) {
  const filePath = await resolveFile(params.path || []);

  if (!filePath) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        'content-type': getContentType(filePath),
        'cache-control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
