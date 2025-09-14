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
const reviewsFile = path.join(dataDir, 'reviews.json');

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dataFile); } catch {
    await fs.writeFile(dataFile, '[]', 'utf8');
  }
  try { await fs.access(reviewsFile); } catch {
    await fs.writeFile(reviewsFile, '[]', 'utf8');
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

async function readReviews() {
  await ensureDataFile();
  const txt = await fs.readFile(reviewsFile, 'utf8');
  try { return JSON.parse(txt || '[]'); } catch { return []; }
}

async function writeReviews(arr) {
  await fs.writeFile(reviewsFile, JSON.stringify(arr, null, 2), 'utf8');
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
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

// Reviews API endpoints
app.get('/api/reviews', async (_req, res) => {
  const reviews = await readReviews();
  // Only return approved reviews (default: all approved unless moderation is configured)
  const approved = reviews.filter(r => r.approved !== false);
  res.json(approved);
});

app.post('/api/reviews', async (req, res) => {
  const { name, rating, text, honeypot, timestamp } = req.body || {};
  
  // Basic validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'review text is required' });
  }
  
  // Anti-spam checks
  if (honeypot && honeypot.trim().length > 0) {
    // Honeypot field should be empty
    return res.status(400).json({ error: 'invalid submission' });
  }
  
  // Check timestamp (submissions should be at least 3 seconds after form load)
  if (timestamp) {
    const submissionTime = Date.now();
    const formLoadTime = parseInt(timestamp, 10);
    if (submissionTime - formLoadTime < 3000) {
      return res.status(400).json({ error: 'submission too quick' });
    }
  }
  
  const reviews = await readReviews();
  const review = {
    id: makeId(),
    name: name.trim(),
    rating: Math.round(rating), // Ensure integer rating
    text: text.trim(),
    createdAt: new Date().toISOString(),
    approved: true // Auto-approve by default, can be changed via config
  };
  
  reviews.push(review);
  await writeReviews(reviews);
  res.status(201).json(review);
});

// Get aggregate rating information
app.get('/api/reviews/stats', async (_req, res) => {
  const reviews = await readReviews();
  const approved = reviews.filter(r => r.approved !== false);
  
  if (approved.length === 0) {
    return res.json({ 
      averageRating: 0, 
      totalReviews: 0, 
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } 
    });
  }
  
  const ratings = approved.map(r => r.rating);
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });
  
  res.json({
    averageRating: Math.round(average * 10) / 10, // Round to 1 decimal
    totalReviews: approved.length,
    ratingDistribution: distribution
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`hairstyleportal listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
