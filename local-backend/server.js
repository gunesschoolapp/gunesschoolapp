const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- SQLite Setup ---
const db = new Database(path.join(__dirname, 'gunes.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Generic entities table (stores all entity types as JSON)
db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_date TEXT DEFAULT (datetime('now')),
    updated_date TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(entity_type);
`);

// --- Constants ---
const APP_ID = '69b72d75a405c6670480bbdf';

// --- Demo User ---
const DEMO_USER = {
  id: 'demo-admin-001',
  email: 'admin@gunesenglish.com',
  full_name: 'Admin User',
  role: 'admin',
  matched_role: 'admin'
};

// --- Helper: parse entity row ---
function parseRow(row) {
  const data = JSON.parse(row.data);
  return { id: row.id, ...data, created_date: row.created_date, updated_date: row.updated_date };
}

// --- App Public Settings (auth check) ---
app.get('/api/apps/public/prod/public-settings/by-id/:appId', (req, res) => {
  res.json({
    id: req.params.appId,
    public_settings: {
      name: 'Gunes CRM',
      auth_required: false,
      allow_signup: false
    }
  });
});

// --- Auth (SDK uses /apps/{appId}/entities/User/me) ---
app.get(`/api/apps/${APP_ID}/entities/User/me`, (req, res) => {
  res.json(DEMO_USER);
});
app.put(`/api/apps/${APP_ID}/entities/User/me`, (req, res) => {
  res.json({ ...DEMO_USER, ...req.body });
});
app.get('/api/apps/auth/me', (req, res) => {
  res.json(DEMO_USER);
});
app.get('/api/auth/me', (req, res) => {
  res.json(DEMO_USER);
});
app.post('/api/apps/auth/logout', (req, res) => {
  res.json({ success: true });
});
app.get('/api/apps/auth/logout', (req, res) => {
  const fromUrl = req.query.from_url || '/';
  res.redirect(fromUrl);
});

// --- Entities CRUD ---

// LIST / FILTER
app.get(`/api/apps/${APP_ID}/entities/:entityName`, (req, res) => {
  const { entityName } = req.params;
  const filters = req.query.filters ? JSON.parse(req.query.filters) : null;
  
  let rows = db.prepare('SELECT * FROM entities WHERE entity_type = ? ORDER BY created_date DESC').all(entityName);
  let results = rows.map(parseRow);

  // Apply simple filters
  if (filters && typeof filters === 'object') {
    Object.entries(filters).forEach(([key, value]) => {
      results = results.filter(r => r[key] == value);
    });
  }

  // Also support query params as filters (SDK sends ?email=xxx)
  const queryFilters = { ...req.query };
  delete queryFilters.filters;
  delete queryFilters.sort;
  delete queryFilters.limit;
  delete queryFilters.offset;
  Object.entries(queryFilters).forEach(([key, value]) => {
    results = results.filter(r => r[key] == value);
  });

  // Sort
  if (req.query.sort) {
    const [field, dir] = req.query.sort.split(':');
    results.sort((a, b) => {
      if (dir === 'desc') return (b[field] || '') > (a[field] || '') ? 1 : -1;
      return (a[field] || '') > (b[field] || '') ? 1 : -1;
    });
  }

  // Limit
  if (req.query.limit) {
    results = results.slice(0, parseInt(req.query.limit));
  }

  res.json(results);
});

// GET BY ID
app.get(`/api/apps/${APP_ID}/entities/:entityName/:id`, (req, res) => {
  const row = db.prepare('SELECT * FROM entities WHERE id = ? AND entity_type = ?').get(req.params.id, req.params.entityName);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(parseRow(row));
});

// CREATE
app.post(`/api/apps/${APP_ID}/entities/:entityName`, (req, res) => {
  const id = uuidv4();
  const data = JSON.stringify(req.body);
  db.prepare('INSERT INTO entities (id, entity_type, data) VALUES (?, ?, ?)').run(id, req.params.entityName, data);
  const row = db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
  res.status(201).json(parseRow(row));
});

// BULK CREATE
app.post(`/api/apps/${APP_ID}/entities/:entityName/bulk`, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  const results = [];
  const insert = db.prepare('INSERT INTO entities (id, entity_type, data) VALUES (?, ?, ?)');
  const tx = db.transaction(() => {
    items.forEach(item => {
      const id = uuidv4();
      insert.run(id, req.params.entityName, JSON.stringify(item));
      results.push({ id, ...item });
    });
  });
  tx();
  res.status(201).json(results);
});

// UPDATE
app.put(`/api/apps/${APP_ID}/entities/:entityName/:id`, (req, res) => {
  const existing = db.prepare('SELECT * FROM entities WHERE id = ? AND entity_type = ?').get(req.params.id, req.params.entityName);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  const oldData = JSON.parse(existing.data);
  const newData = JSON.stringify({ ...oldData, ...req.body });
  db.prepare("UPDATE entities SET data = ?, updated_date = datetime('now') WHERE id = ?").run(newData, req.params.id);
  const row = db.prepare('SELECT * FROM entities WHERE id = ?').get(req.params.id);
  res.json(parseRow(row));
});

// UPDATE MANY
app.patch(`/api/apps/${APP_ID}/entities/:entityName/update-many`, (req, res) => {
  const { query, data } = req.body;
  let rows = db.prepare('SELECT * FROM entities WHERE entity_type = ?').all(req.params.entityName);
  let matched = rows.map(parseRow);
  if (query) {
    Object.entries(query).forEach(([k, v]) => { matched = matched.filter(r => r[k] == v); });
  }
  const update = db.prepare("UPDATE entities SET data = ?, updated_date = datetime('now') WHERE id = ?");
  const tx = db.transaction(() => {
    matched.forEach(item => {
      const merged = { ...item, ...data };
      delete merged.id; delete merged.created_date; delete merged.updated_date;
      update.run(JSON.stringify(merged), item.id);
    });
  });
  tx();
  res.json({ modified: matched.length });
});

// DELETE
app.delete(`/api/apps/${APP_ID}/entities/:entityName/:id`, (req, res) => {
  db.prepare('DELETE FROM entities WHERE id = ? AND entity_type = ?').run(req.params.id, req.params.entityName);
  res.json({ success: true });
});

// DELETE MANY (query in body)
app.delete(`/api/apps/${APP_ID}/entities/:entityName`, (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.json([]);
  }
  let rows = db.prepare('SELECT * FROM entities WHERE entity_type = ?').all(req.params.entityName);
  let matched = rows.map(parseRow);
  Object.entries(req.body).forEach(([k, v]) => { matched = matched.filter(r => r[k] == v); });
  const del = db.prepare('DELETE FROM entities WHERE id = ?');
  matched.forEach(item => del.run(item.id));
  res.json({ deleted: matched.length });
});

// --- Functions (stub) ---
app.post(`/api/apps/${APP_ID}/functions/:funcName`, (req, res) => {
  console.log(`[Function called] ${req.params.funcName}`, JSON.stringify(req.body).substring(0, 200));
  res.json({ success: true, message: `Function ${req.params.funcName} executed (stub)` });
});
app.post(`/api/apps/${APP_ID}/functions/:version/:funcName`, (req, res) => {
  console.log(`[Function called] ${req.params.funcName} v${req.params.version}`);
  res.json({ success: true, message: `Function ${req.params.funcName} executed (stub)` });
});

// --- Agents (stub) ---
app.get(`/api/apps/${APP_ID}/agents/conversations`, (req, res) => res.json([]));
app.post(`/api/apps/${APP_ID}/agents/conversations`, (req, res) => res.json({ id: uuidv4(), ...req.body }));

// --- App Logs (stub) ---
app.post('/api/app-logs/:appId/log-user-in-app/:pageName', (req, res) => res.json({ success: true }));

// --- Stripe Checkout ---
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { packageName, price, currency, studentEmail, studentName, packageId } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: studentEmail,
      line_items: [{
        price_data: {
          currency: currency || 'gbp',
          product_data: { name: packageName, description: `Gunes English School - ${packageName}` },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:5173'}/Packages?success=true&session_id={CHECKOUT_SESSION_ID}&package_id=${packageId}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/Packages?canceled=true`,
      metadata: { packageId, studentEmail, studentName },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[Stripe Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stripe/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ status: session.payment_status, customer_email: session.customer_email, metadata: session.metadata });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Catch-all for unknown API routes ---
app.all('/api/*', (req, res) => {
  console.log(`[Unhandled] ${req.method} ${req.path}`);
  res.json([]);
});

// --- Start ---
const PORT = 3044;
app.listen(PORT, () => {
  console.log(`\n🟢 Gunes CRM Local Backend running on http://localhost:${PORT}`);
  console.log(`   Demo user: ${DEMO_USER.email} (${DEMO_USER.role})`);
  
  // Check if seed data exists
  const count = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
  if (count === 0) {
    console.log('   📦 No data found. Run: node seed.js');
  } else {
    console.log(`   📊 ${count} records in database`);
  }
  console.log('');
});
