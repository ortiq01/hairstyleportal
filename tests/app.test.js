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

  describe('Booking API', () => {
    beforeEach(async () => {
      // Reset booking config before each test
      await request(app)
        .post('/api/booking/config')
        .send({ provider: null, settings: {} })
        .set('Content-Type', 'application/json');
    });

    it('GET /api/booking/config returns default config when none set', async () => {
      const res = await request(app).get('/api/booking/config');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        provider: null,
        settings: {}
      });
    });

    it('POST /api/booking/config sets and validates provider', async () => {
      const config = {
        provider: 'whatsapp',
        settings: { phoneNumber: '+1234567890' }
      };
      
      const res = await request(app)
        .post('/api/booking/config')
        .send(config)
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual(config);
    });

    it('POST /api/booking/config rejects invalid provider', async () => {
      const res = await request(app)
        .post('/api/booking/config')
        .send({ provider: 'invalid' })
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid provider');
    });

    it('POST /api/booking/initiate returns fallback when no provider configured', async () => {
      // Reset config to default
      await request(app)
        .post('/api/booking/config')
        .send({ provider: null })
        .set('Content-Type', 'application/json');

      const res = await request(app)
        .post('/api/booking/initiate')
        .send({ service: 'Haircut' })
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('fallback');
      expect(res.body.fallbackUrl).toBe('#contact');
    });

    it('POST /api/booking/initiate returns WhatsApp URL with pre-filled message', async () => {
      // Configure WhatsApp provider
      await request(app)
        .post('/api/booking/config')
        .send({
          provider: 'whatsapp',
          settings: { phoneNumber: '+1234567890' }
        })
        .set('Content-Type', 'application/json');

      const res = await request(app)
        .post('/api/booking/initiate')
        .send({
          service: 'Haircut',
          stylist: 'John',
          preferredDate: '2024-01-15',
          preferredTime: '14:00'
        })
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('whatsapp');
      expect(res.body.provider).toBe('whatsapp');
      expect(res.body.url).toContain('wa.me/1234567890');
      expect(res.body.message).toContain('Haircut');
      expect(res.body.message).toContain('John');
    });

    it('POST /api/booking/initiate returns embed action for Salonized', async () => {
      await request(app)
        .post('/api/booking/config')
        .send({
          provider: 'salonized',
          settings: { embedScript: '<script>console.log("salonized")</script>' }
        })
        .set('Content-Type', 'application/json');

      const res = await request(app)
        .post('/api/booking/initiate')
        .send({ service: 'Haircut' })
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('embed');
      expect(res.body.provider).toBe('salonized');
    });

    it('POST /api/booking/initiate returns link action for Treatwell', async () => {
      await request(app)
        .post('/api/booking/config')
        .send({
          provider: 'treatwell',
          settings: { bookingUrl: 'https://example.treatwell.com' }
        })
        .set('Content-Type', 'application/json');

      const res = await request(app)
        .post('/api/booking/initiate')
        .send({ service: 'Haircut' })
        .set('Content-Type', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('link');
      expect(res.body.provider).toBe('treatwell');
      expect(res.body.url).toBe('https://example.treatwell.com');
    });
  });
});
