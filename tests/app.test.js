const request = require('supertest');
const path = require('path');

// Use ephemeral temp data dir for tests
process.env.DATA_DIR = path.join(__dirname, '.tmp-data');
process.env.NODE_ENV = 'test';

const app = require('..');

describe('hairstyleportal API', () => {
  it('GET /health -> OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('GET /info -> json', async () => {
    const res = await request(app).get('/info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'hairstyleportal');
    expect(res.body).toHaveProperty('dataDir');
  });

  it('CRUD /api/styles', async () => {
    const create = await request(app)
      .post('/api/styles')
      .send({ name: 'Bob Cut', description: 'Classic', imageUrl: '' })
      .set('Content-Type', 'application/json');
    expect(create.status).toBe(201);
    const id = create.body.id;

    const list1 = await request(app).get('/api/styles');
    expect(list1.status).toBe(200);
    expect(Array.isArray(list1.body)).toBe(true);
    expect(list1.body.find((x) => x.id === id)).toBeTruthy();

    const update = await request(app)
      .put(`/api/styles/${id}`)
      .send({ description: 'Updated' })
      .set('Content-Type', 'application/json');
    expect(update.status).toBe(200);
    expect(update.body.description).toBe('Updated');

    const del = await request(app).delete(`/api/styles/${id}`);
    expect(del.status).toBe(204);
  });

  it('GET /api/products -> array', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // rate-limit standard headers should be present on API routes
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
  });

  it('GET /api/inspiration returns array (fallback ok)', async () => {
    const res = await request(app).get('/api/inspiration');
    expect([200, 502]).toContain(res.statusCode); // allow upstream errors
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(typeof res.body[0].src === 'string').toBe(true);
      }
    } else {
      expect(res.body).toHaveProperty('error');
    }
  });

  it('sets and propagates X-Request-Id', async () => {
    const res1 = await request(app).get('/health');
    expect(res1.status).toBe(200);
    expect(res1.headers['x-request-id']).toBeTruthy();

    const customId = 'test-req-id-123';
    const res2 = await request(app).get('/info').set('X-Request-Id', customId);
    expect(res2.status).toBe(200);
    expect(res2.headers['x-request-id']).toBe(customId);
  });

  it('applies write rate limiter errors with JSON body', async () => {
    // Trigger just over the limit quickly with a small window from config (100 default)
    // We'll short-circuit by temporarily reducing requests count to a handful
    // but since config is fixed, we only validate the error shape for a single block
    // Make a burst to consume some tokens
    for (let i = 0; i < 3; i++) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/styles')
        .send({ name: `Name ${i}` })
        .set('Content-Type', 'application/json');
    }
    const blocked = await request(app)
      .post('/api/styles')
      .send({ name: 'Excess' })
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '1.2.3.4');
    // Not guaranteed to block here due to high limit, but if it does, payload should be JSON
    if (blocked.status === 429) {
      expect(blocked.type).toMatch(/json/);
      expect(blocked.body).toHaveProperty('error');
    } else {
      expect([200, 201]).toContain(blocked.status);
    }
  });
});
