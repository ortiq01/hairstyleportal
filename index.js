const express = require('express');
const helmet = require('helmet');
const { fetch } = require('undici');
const { httpLogger } = require('./middleware/logging');
const { apiLimiter, writeLimiter } = require('./middleware/rateLimit');
const { validateStyleCreate, validateStyleUpdate } = require('./middleware/validation');
const { notFound, methodNotAllowed, errorHandler } = require('./middleware/errors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const pkg = require('./package.json');
const { randomUUID } = require('crypto');

const app = express();
// Trust reverse proxy (Nginx) for correct req.ip and secure headers
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': [
          "'self'",
          'data:',
          'https://images.unsplash.com',
          'https://source.unsplash.com',
        ],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// JSON body limit & logging
app.use(express.json({ limit: '100kb' }));
app.use(httpLogger);
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id || randomUUID());
  next();
});
const PORT = process.env.PORT || 3008;

app.use(express.static('public'));
app.use('/api', apiLimiter);

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'styles.json');
const productsFile = path.join(dataDir, 'products.json');
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '[]', 'utf8');
  }
}

async function readStyles() {
  await ensureDataFile();
  const txt = await fs.readFile(dataFile, 'utf8');
  try {
    return JSON.parse(txt || '[]');
  } catch {
    return [];
  }
}

async function writeStyles(arr) {
  await fs.writeFile(dataFile, JSON.stringify(arr, null, 2), 'utf8');
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

async function ensureProductsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(productsFile);
  } catch {
    await fs.writeFile(productsFile, '[]', 'utf8');
  }
}

async function readProducts() {
  await ensureProductsFile();
  const txt = await fs.readFile(productsFile, 'utf8');
  try {
    return JSON.parse(txt || '[]');
  } catch {
    return [];
  }
}

app.get('/health', (_req, res) => res.send('OK'));

app.get('/info', async (_req, res) => {
  res.json({
    name: 'hairstyleportal',
    version: pkg.version,
    node: process.version,
    hostname: os.hostname(),
    cwd: process.cwd(),
    dataDir,
  });
});

app.get('/api/styles', async (_req, res) => {
  const styles = await readStyles();
  res.json(styles);
});

app.post('/api/styles', writeLimiter, validateStyleCreate, async (req, res) => {
  const styles = await readStyles();
  const item = { id: makeId(), ...req.validatedBody };
  styles.push(item);
  await writeStyles(styles);
  res.status(201).json(item);
});

app.put('/api/styles/:id', writeLimiter, validateStyleUpdate, async (req, res) => {
  const { id } = req.params;
  const styles = await readStyles();
  const idx = styles.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  styles[idx] = { ...styles[idx], ...req.validatedBody, id };
  await writeStyles(styles);
  res.json(styles[idx]);
});

app.delete('/api/styles/:id', async (req, res) => {
  const { id } = req.params;
  const styles = await readStyles();
  const next = styles.filter((s) => s.id !== id);
  if (next.length === styles.length) return res.status(404).json({ error: 'not found' });
  await writeStyles(next);
  res.status(204).send();
});

app.get('/api/products', async (_req, res) => {
  const products = await readProducts();
  res.json(products);
});

// Inspiration images from Unsplash (or fallback)
app.get('/api/inspiration', async (_req, res) => {
  try {
    // If an API key is available, query Unsplash API for hairstyle photos
    if (UNSPLASH_ACCESS_KEY) {
      const q = new URLSearchParams({
        query: 'hairstyle',
        per_page: '12',
        orientation: 'portrait',
      }).toString();
      const resp = await fetch(`https://api.unsplash.com/search/photos?${q}`, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
      });
      if (!resp.ok) throw new Error(`unsplash ${resp.status}`);
      const data = await resp.json();
      const items = Array.isArray(data.results)
        ? data.results.map((p) => ({
            id: p.id,
            src: p.urls && (p.urls.small_s3 || p.urls.small || p.urls.thumb),
            alt: p.alt_description || 'hairstyle inspiration',
            author: p.user && (p.user.name || p.user.username),
            link: p.links && p.links.html,
          }))
        : [];
      return res.json(items.filter((i) => i.src));
    }

    // Fallback: unauthenticated Source URLs (may redirect to images.unsplash.com)
    const fallback = Array.from({ length: 12 }).map((_, i) => ({
      id: `fallback-${i + 1}`,
      src: `https://source.unsplash.com/featured/800x1000/?hairstyle,hair,beauty&sig=${i + 1}`,
      alt: 'hairstyle inspiration',
      author: 'Unsplash',
      link: 'https://unsplash.com/s/photos/hairstyle',
    }));
    return res.json(fallback);
  } catch (_e) {
    return res.status(502).json({ error: 'inspiration_unavailable' });
  }
});

// Fallbacks & error handling
app.all('/api/*', methodNotAllowed); // will only hit for unsupported methods if not matched earlier
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`hairstyleportal listening on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
