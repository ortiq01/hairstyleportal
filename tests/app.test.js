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

  describe('Reviews API', () => {
    it('GET /api/reviews -> empty array initially', async () => {
      const res = await request(app).get('/api/reviews');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/reviews/stats -> zero stats initially', async () => {
      const res = await request(app).get('/api/reviews/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    });

    it('POST /api/reviews -> creates review', async () => {
      const reviewData = {
        name: 'John Doe',
        rating: 5,
        text: 'Excellent service! Very professional.',
        timestamp: Date.now() - 5000, // 5 seconds ago
        honeypot: ''
      };

      const res = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(reviewData.name);
      expect(res.body.rating).toBe(reviewData.rating);
      expect(res.body.text).toBe(reviewData.text);
      expect(res.body.approved).toBe(true);
      expect(res.body).toHaveProperty('createdAt');
    });

    it('POST /api/reviews -> validates required fields', async () => {
      // Missing name
      const res1 = await request(app)
        .post('/api/reviews')
        .send({ rating: 5, text: 'Great!' })
        .set('Content-Type', 'application/json');
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('name is required');

      // Invalid rating
      const res2 = await request(app)
        .post('/api/reviews')
        .send({ name: 'John', rating: 6, text: 'Great!' })
        .set('Content-Type', 'application/json');
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('rating must be a number between 1 and 5');

      // Missing text
      const res3 = await request(app)
        .post('/api/reviews')
        .send({ name: 'John', rating: 5 })
        .set('Content-Type', 'application/json');
      expect(res3.status).toBe(400);
      expect(res3.body.error).toContain('review text is required');
    });

    it('POST /api/reviews -> blocks spam (honeypot)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          name: 'Spammer',
          rating: 5,
          text: 'Spam review',
          honeypot: 'I am a bot'
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid submission');
    });

    it('POST /api/reviews -> blocks too quick submissions', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          name: 'Quick User',
          rating: 5,
          text: 'Quick review',
          timestamp: Date.now() - 1000 // Only 1 second ago
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('submission too quick');
    });

    it('Reviews flow: create -> list -> stats', async () => {
      // Create multiple reviews
      const reviews = [
        { name: 'Alice', rating: 5, text: 'Perfect!', timestamp: Date.now() - 5000 },
        { name: 'Bob', rating: 4, text: 'Very good', timestamp: Date.now() - 4000 },
        { name: 'Carol', rating: 5, text: 'Amazing service', timestamp: Date.now() - 3000 }
      ];

      for (const review of reviews) {
        const res = await request(app)
          .post('/api/reviews')
          .send({ ...review, honeypot: '' })
          .set('Content-Type', 'application/json');
        expect(res.status).toBe(201);
      }

      // Check list endpoint
      const listRes = await request(app).get('/api/reviews');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThanOrEqual(3);

      // Check stats endpoint
      const statsRes = await request(app).get('/api/reviews/stats');
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.totalReviews).toBeGreaterThanOrEqual(3);
      expect(statsRes.body.averageRating).toBeGreaterThan(4);
      expect(statsRes.body.ratingDistribution[4]).toBeGreaterThanOrEqual(1);
      expect(statsRes.body.ratingDistribution[5]).toBeGreaterThanOrEqual(2);
    });
  });
});
