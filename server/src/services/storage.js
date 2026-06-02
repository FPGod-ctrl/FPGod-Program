import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Storage abstraction. The local driver writes to UPLOAD_DIR; swap in an
 * S3/GCS driver later by implementing the same interface and switching on
 * env.storage.driver — routes never touch the filesystem directly.
 *
 * Interface:
 *   save(buffer, originalName, mimeType) -> { key, size }
 *   read(key) -> Buffer
 *   remove(key) -> void
 *   absolutePath(key) -> string | null   (local only; for streaming downloads)
 */

const uploadRoot = path.isAbsolute(env.storage.uploadDir)
  ? env.storage.uploadDir
  : path.resolve(__dirname, '../../', env.storage.uploadDir);

async function ensureDir() {
  await fs.mkdir(uploadRoot, { recursive: true });
}

const localDriver = {
  async save(buffer, originalName) {
    await ensureDir();
    const ext = path.extname(originalName) || '';
    const key = `${Date.now()}-${randomUUID()}${ext}`;
    const dest = path.join(uploadRoot, key);
    await fs.writeFile(dest, buffer);
    return { key, size: buffer.length };
  },
  async read(key) {
    return fs.readFile(path.join(uploadRoot, key));
  },
  async remove(key) {
    await fs.rm(path.join(uploadRoot, key), { force: true });
  },
  absolutePath(key) {
    // Guard against path traversal in stored keys.
    const resolved = path.resolve(uploadRoot, key);
    return resolved.startsWith(uploadRoot) ? resolved : null;
  },
};

const drivers = { local: localDriver };

export const storage = drivers[env.storage.driver] || localDriver;
export default storage;
