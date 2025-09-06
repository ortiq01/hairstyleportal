const express = require('express');
const path = require('path');
const os = require('os');
const app = express();
const port = process.env.PORT || 3008;

app.get('/health', (req, res) => res.send('OK'));
app.get('/info', (req, res) => {
  res.json({
    env: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
  });
});
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, '0.0.0.0', () => {
  console.log(`hairstyleportal listening on port ${port}`);
});
