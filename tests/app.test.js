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
    expect(list1.body.find(x => x.id === id)).toBeTruthy();

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
  });
});
