import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = createApp();

beforeAll(async () => {
  // Ensure the schema exists (idempotent) so tests run against a real DB.
  const sql = await fs.readFile(path.resolve(__dirname, '../db/schema.sql'), 'utf8');
  await pool.query(sql);
});

afterAll(async () => {
  await pool.end();
});

describe('health & meta', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/meta exposes service config', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('aiEnabled');
    expect(res.body).toHaveProperty('model');
    expect(res.body.storageDriver).toBe('local');
  });

  it('unknown routes return a 404 JSON error', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});

describe('client lifecycle + AI plan generation (stub mode)', () => {
  let clientId;

  it('rejects a client with no name', async () => {
    const res = await request(app).post('/api/clients').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('creates a client', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ first_name: 'Vitest', last_name: 'Tester', status: 'active', risk_profile: 'balanced' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    clientId = res.body.id;
  });

  it('fetches the created client', async () => {
    const res = await request(app).get(`/api/clients/${clientId}`);
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Vitest');
  });

  it('adds a current investment for the client', async () => {
    const res = await request(app)
      .post('/api/investments/current')
      .send({ client_id: clientId, fund_name: 'Test Fund', balance: 1000, allocation_pct: 100, fee_pct: 0.2 });
    expect(res.status).toBe(201);
    expect(res.body.fund_name).toBe('Test Fund');
  });

  it('returns an investment comparison with totals', async () => {
    const res = await request(app).get(`/api/investments/comparison/${clientId}`);
    expect(res.status).toBe(200);
    expect(res.body.totals.currentBalance).toBe(1000);
  });

  it('generates a plan in stub mode (no OpenAI key)', async () => {
    const res = await request(app)
      .post('/api/plans/generate')
      .send({ clientId, save: false });
    expect(res.status).toBe(200);
    expect(res.body.ai).toBe(false);
    expect(res.body.content).toContain('Financial Plan');
  });

  it('deletes the client (cascades children)', async () => {
    const res = await request(app).delete(`/api/clients/${clientId}`);
    expect(res.status).toBe(204);
    const after = await request(app).get(`/api/clients/${clientId}`);
    expect(after.status).toBe(404);
  });
});
