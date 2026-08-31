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

  // The advising firm. Reference material imported from the previous practice
  // carries ITS letterhead, licensee, AR number and AFSL. Generators are told
  // this name explicitly and told never to reproduce the one in the examples —
  // issuing advice under another licensee's AFSL is a compliance breach, and
  // it is exactly the kind of error that reads as correct at a glance.
  firm: {
    name: process.env.FIRM_NAME || 'Legacy Risk Advice',
    legalName: process.env.FIRM_LEGAL_NAME || 'Legacy Risk Advice Pty Ltd',
    ar: process.env.FIRM_AR || '1296611',
    abn: process.env.FIRM_ABN || '22 655 978 046',
    address: process.env.FIRM_ADDRESS || 'Level 3, 489-505 Toorak Road, Toorak VIC 3142',
    // Legacy Risk Advice is a corporate Authorised Representative; the AFSL is
    // the licensee's, not the firm's. Getting this pair wrong on a document is
    // a compliance breach, so both are configured rather than inferred.
    licensee: process.env.LICENSEE_NAME || 'Synchron Advice Pty Ltd',
    licenseeAfsl: process.env.LICENSEE_AFSL || '243313',
    licenseeAbn: process.env.LICENSEE_ABN || '33 007 207 650',
  },

  // The individual adviser the document goes out under. Their own AR number is
  // pending, so it is left blank and rendered as [ADVISOR TO CONFIRM] rather
  // than falling back to another adviser's.
  adviser: {
    name: process.env.ADVISER_NAME || 'Tristan Biro',
    ar: process.env.ADVISER_AR || '',
    email: process.env.ADVISER_EMAIL || '',
    phone: process.env.ADVISER_PHONE || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    get enabled() {
      return Boolean(process.env.ANTHROPIC_API_KEY);
    },
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxUploadBytes: num(process.env.MAX_UPLOAD_MB, 25) * 1024 * 1024,
  },
};

export default env;
