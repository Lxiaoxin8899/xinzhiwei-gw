const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]', 'utf-8');

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');
app.set('trust proxy', true);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for now due to inline styles; tighten in future
  crossOriginEmbedderPolicy: false,
  hsts: {
    includeSubDomains: false,
  },
}));

// Gzip compression
app.use(compression());

// Access logging
app.use(morgan('combined'));

// Parse form data
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
}));

// Clean URL routes
app.get('/scenario', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scenario.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'projects.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Contact form handler
app.post('/api/contact', (req, res) => {
  const { name, contact, message } = req.body;
  if (!name || !contact || !message) {
    return res.status(400).json({ error: '请填写所有字段' });
  }
  const entry = { id: Date.now(), name, contact, message, time: new Date().toISOString() };
  try {
    const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    messages.push(entry);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Contact Form] Write error:', e.message);
    return res.status(500).json({ error: '服务器存储异常，请稍后重试' });
  }
  console.log('[Contact Form]', entry);
  res.json({ success: true, message: '感谢您的留言，我们会尽快回复！' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) {
      res.status(404).send('页面未找到');
    }
  });
});

app.listen(PORT, () => {
  console.log(`新智微科技 Web Server is running on http://localhost:${PORT}`);
});
