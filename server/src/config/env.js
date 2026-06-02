import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env regardless of the cwd nodemon is launched from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, fallback = false) =>
  v == null ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || 'localhost',
    port: num(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'fpgod',
    password: process.env.PGPASSWORD || 'fpgod',
    database: process.env.PGDATABASE || 'fpgod',
    ssl: bool(process.env.PGSSL) ? { rejectUnauthorized: false } : false,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    get enabled() {
      return Boolean(process.env.OPENAI_API_KEY);
    },
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxUploadBytes: num(process.env.MAX_UPLOAD_MB, 25) * 1024 * 1024,
  },
};

export default env;
