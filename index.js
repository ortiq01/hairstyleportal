const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());
app.use(express.static('public'));

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'styles.json');
const productsFile = path.join(dataDir, 'products.json');

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dataFile); } catch {
    await fs.writeFile(dataFile, '[]', 'utf8');
  }
}

async function readStyles() {
  await ensureDataFile();
  const txt = await fs.readFile(dataFile, 'utf8');
  try { return JSON.parse(txt || '[]'); } catch { return []; }
}

async function writeStyles(arr) {
  await fs.writeFile(dataFile, JSON.stringify(arr, null, 2), 'utf8');
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

async function ensureProductsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(productsFile); } catch {
    await fs.writeFile(productsFile, '[]', 'utf8');
  }
}

async function readProducts() {
  await ensureProductsFile();
  const txt = await fs.readFile(productsFile, 'utf8');
  try { return JSON.parse(txt || '[]'); } catch { return []; }
}

app.get('/health', (_req, res) => res.send('OK'));

app.get('/info', async (_req, res) => {
  res.json({
    name: 'hairstyleportal',
    node: process.version,
    hostname: os.hostname(),
    cwd: process.cwd(),
    dataDir
  });
});

app.get('/api/styles', async (_req, res) => {
  const styles = await readStyles();
  res.json(styles);
});

app.post('/api/styles', async (req, res) => {
  const { name, description, imageUrl } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const styles = await readStyles();
  const item = { id: makeId(), name, description: description || '', imageUrl: imageUrl || '' };
  styles.push(item);
  await writeStyles(styles);
  res.status(201).json(item);
});

app.put('/api/styles/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const styles = await readStyles();
  const idx = styles.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  styles[idx] = { ...styles[idx], ...updates, id };
  await writeStyles(styles);
  res.json(styles[idx]);
});

app.delete('/api/styles/:id', async (req, res) => {
  const { id } = req.params;
  const styles = await readStyles();
  const next = styles.filter(s => s.id !== id);
  if (next.length === styles.length) return res.status(404).json({ error: 'not found' });
  await writeStyles(next);
  res.status(204).send();
});

app.get('/api/products', async (_req, res) => {
  const products = await readProducts();
  res.json(products);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`hairstyleportal listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
