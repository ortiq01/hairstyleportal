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
const configFile = path.join(dataDir, 'booking-config.json');

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

async function readBookingConfig() {
  await ensureDataFile();
  try {
    const txt = await fs.readFile(configFile, 'utf8');
    return JSON.parse(txt || '{}');
  } catch {
    // Return default config
    return {
      provider: null, // 'salonized', 'treatwell', 'whatsapp', or null
      settings: {}
    };
  }
}

async function writeBookingConfig(config) {
  await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
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

// Booking configuration endpoints
app.get('/api/booking/config', async (_req, res) => {
  const config = await readBookingConfig();
  res.json(config);
});

app.post('/api/booking/config', async (req, res) => {
  const { provider, settings } = req.body || {};
  
  // Validate provider
  const validProviders = [null, 'salonized', 'treatwell', 'whatsapp'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider. Must be one of: salonized, treatwell, whatsapp, or null' });
  }
  
  const config = { provider, settings: settings || {} };
  await writeBookingConfig(config);
  res.json(config);
});

// Booking initiation endpoint
app.post('/api/booking/initiate', async (req, res) => {
  const config = await readBookingConfig();
  const { service, stylist, preferredDate, preferredTime } = req.body || {};
  
  if (!config.provider) {
    return res.json({
      action: 'fallback',
      message: 'No booking provider configured. Please contact us directly.',
      fallbackUrl: '#contact'
    });
  }
  
  switch (config.provider) {
    case 'salonized':
      return res.json({
        action: 'embed',
        provider: 'salonized',
        embedScript: config.settings.embedScript || '',
        params: { service, stylist, preferredDate, preferredTime }
      });
      
    case 'treatwell':
      return res.json({
        action: 'link',
        provider: 'treatwell',
        url: config.settings.bookingUrl || 'https://www.treatwell.com',
        params: { service, stylist, preferredDate, preferredTime }
      });
      
    case 'whatsapp':
      const phone = config.settings.phoneNumber || '';
      const message = generateWhatsAppMessage(service, stylist, preferredDate, preferredTime);
      return res.json({
        action: 'whatsapp',
        provider: 'whatsapp',
        url: `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`,
        message
      });
      
    default:
      return res.json({
        action: 'fallback',
        message: 'Booking provider not properly configured.',
        fallbackUrl: '#contact'
      });
  }
});

function generateWhatsAppMessage(service, stylist, preferredDate, preferredTime) {
  let message = 'Hi! I would like to book an appointment.';
  
  if (service) message += `\n\nService: ${service}`;
  if (stylist) message += `\nStylist: ${stylist}`;
  if (preferredDate) message += `\nPreferred Date: ${preferredDate}`;
  if (preferredTime) message += `\nPreferred Time: ${preferredTime}`;
  
  message += '\n\nPlease let me know if this works for you or suggest alternative times. Thank you!';
  
  return message;
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`hairstyleportal listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
