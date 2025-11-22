// server.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Render のポート
const PORT = process.env.PORT || 3000;

// 環境変数
const TOKEN = process.env.TSUMUGI_TOKEN;

// IP 制限（必要なときだけ）
const allowedIps = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(ip => ip.length > 0);

// メモリ保存先のルート
const MEMORY_ROOT = path.join(__dirname, 'data', 'tsumugi');

// 認証ヘッダ名
const AUTH_HEADER_NAME = 'x-tsumugi-token';

app.use(express.json());

/** ===============================
 *  IP 制限
 * =============================== */
function ipGuard(req, res, next) {
  if (allowedIps.length === 0) return next();

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;

  if (!allowedIps.includes(ip)) {
    return res.status(403).json({ error: 'forbidden_ip' });
  }

  next();
}

/** ===============================
 *  トークンチェック
 * =============================== */
function authGuard(req, res, next) {
  if (!TOKEN) {
    return res.status(500).json({ error: 'server_token_not_configured' });
  }

  const headerToken = req.headers[AUTH_HEADER_NAME];
  const queryToken = req.query.token;
  const token = headerToken || queryToken;

  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  next();
}

/** ===============================
 *  メモリ保存のヘルパー関数
 * =============================== */
async function ensureMemoryDir() {
  await fs.mkdir(MEMORY_ROOT, { recursive: true });
}

function keyToPath(key) {
  return path.join(MEMORY_ROOT, `${key}.json`);
}

async function saveMemory(key, data) {
  await ensureMemoryDir();
  const filePath = keyToPath(key);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function loadMemory(key) {
  const filePath = keyToPath(key);
  const json = await fs.readFile(filePath, 'utf8');
  return JSON.parse(json);
}

async function listMemoryKeys() {
  await ensureMemoryDir();
  const files = await fs.readdir(MEMORY_ROOT);
  return files
    .filter(name => name.endsWith('.json'))
    .map(name => name.replace(/\.json$/, ''));
}

/** ===============================
 *  Root 確認
 * =============================== */
app.get('/', (req, res) => {
  res.send('Ribbon Field Core is alive.');
});

/** ===============================
 *  つむぎ専用 API: /core
 * =============================== */
app.post('/core', ipGuard, authGuard, (req, res) => {
  const payload = req.body || {};

  res.json({
    ok: true,
    message: 'Ribbon Field Core received your thought.',
    receivedAt: new Date().toISOString(),
    payload,
  });
});

/** ===============================
 *  /memory/save  ← これが今日の本命
 * =============================== */
app.post('/memory/save', ipGuard, authGuard, async (req, res) => {
  try {
    const { key, data } = req.body || {};

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    await saveMemory(key, data);

    return res.json({
      status: 'ok',
      key,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('memory/save error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/** ===============================
 *  /memory/load
 * =============================== */
app.get('/memory/load', ipGuard, authGuard, async (req, res) => {
  try {
    const key = req.query.key;

    if (!key) {
      return res.status(400).json({ error: 'key query is required' });
    }

    const data = await loadMemory(key);

    return res.json({ key, data });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'not_found' });
    }
    console.error('memory/load error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/** ===============================
 *  /memory/list
 * =============================== */
app.get('/memory/list', ipGuard, authGuard, async (req, res) => {
  try {
    const keys = await listMemoryKeys();
    return res.json({ keys });
  } catch (err) {
    console.error('memory/list error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/** ===============================
 *  Start
 * =============================== */
app.listen(PORT, () => {
  console.log(`Ribbon Field Core listening on port ${PORT}`);
});