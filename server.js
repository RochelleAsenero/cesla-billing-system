require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE CONNECTION ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// ── INIT TABLES ──
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_entries (
        id           SERIAL PRIMARY KEY,
        category     TEXT    NOT NULL,
        year         INTEGER NOT NULL,
        month        INTEGER NOT NULL,
        department   TEXT    NOT NULL,
        amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
        data         JSONB   NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_billing_cat_year_month
        ON billing_entries(category, year, month);

      CREATE TABLE IF NOT EXISTS app_settings (
        id             INTEGER PRIMARY KEY DEFAULT 1,
        prepared_by    TEXT DEFAULT '',
        prepared_title TEXT DEFAULT '',
        checked_by     TEXT DEFAULT '',
        checked_title  TEXT DEFAULT '',
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO app_settings (id) VALUES (1)
        ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════

// GET entries for a category/year/month
app.get('/api/entries', async (req, res) => {
  const { cat, year, month } = req.query;
  if (!cat || year === undefined || month === undefined) {
    return res.status(400).json({ error: 'cat, year, month required' });
  }
  try {
    const result = await pool.query(
      `SELECT id, category, year, month, department, amount::float, data
       FROM billing_entries
       WHERE category=$1 AND year=$2 AND month=$3
       ORDER BY department, id`,
      [cat, parseInt(year), parseInt(month)]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET yearly totals per category
app.get('/api/yearly', async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'year required' });
  try {
    const result = await pool.query(
      `SELECT category, SUM(amount)::float AS total
       FROM billing_entries
       WHERE year=$1
       GROUP BY category`,
      [parseInt(year)]
    );
    const totals = {};
    result.rows.forEach(r => { totals[r.category] = r.total || 0; });
    res.json(totals);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET entries for a full year (for print — all months)
app.get('/api/entries/year', async (req, res) => {
  const { cat, year } = req.query;
  if (!cat || !year) return res.status(400).json({ error: 'cat, year required' });
  try {
    const result = await pool.query(
      `SELECT id, category, year, month, department, amount::float, data
       FROM billing_entries
       WHERE category=$1 AND year=$2
       ORDER BY month, department, id`,
      [cat, parseInt(year)]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST add entry
app.post('/api/entries', async (req, res) => {
  const { category, year, month, department, amount, data } = req.body;
  if (!category || year === undefined || month === undefined || !department) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO billing_entries (category, year, month, department, amount, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [category, parseInt(year), parseInt(month), department,
       parseFloat(amount) || 0, JSON.stringify(data || {})]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT edit entry
app.put('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, data, department, year, month } = req.body;
  try {
    await pool.query(
      `UPDATE billing_entries
       SET amount=$1, data=$2, department=$3, year=$4, month=$5, updated_at=NOW()
       WHERE id=$6`,
      [parseFloat(amount) || 0, JSON.stringify(data || {}),
       department, parseInt(year), parseInt(month), parseInt(id)]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE entry
app.delete('/api/entries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_entries WHERE id=$1', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM app_settings WHERE id=1');
    res.json(result.rows[0] || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST save settings
app.post('/api/settings', async (req, res) => {
  const { preparedBy, preparedTitle, checkedBy, checkedTitle } = req.body;
  try {
    await pool.query(
      `UPDATE app_settings
       SET prepared_by=$1, prepared_title=$2, checked_by=$3, checked_title=$4, updated_at=NOW()
       WHERE id=1`,
      [preparedBy || '', preparedTitle || '', checkedBy || '', checkedTitle || '']
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ──
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CESLA Billing System running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to init DB:', err);
  process.exit(1);
});
