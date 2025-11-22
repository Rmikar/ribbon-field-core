// server.js

const express = require('express');
const app = express();

// Render が自動で PORT をくれる。なければ 3000
const PORT = process.env.PORT || 3000;

// ✅ Render の Environment Variables に入れたキー
//   例: TSUMUGI_TOKEN = TsumuMika$pixte0
const TOKEN = process.env.TSUMUGI_TOKEN;

// IP 制限（必要なら）: ALLOWED_IPS に「1.2.3.4,5.6.7.8」みたいに入れる
const allowedIps = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(ip => ip.length > 0);

app.use(express.json());

/** IP制限（ALLOWED_IPS が空なら何もしない） */
function ipGuard(req, res, next) {
  if (allowedIps.length === 0) return next();

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;

  if (!allowedIps.includes(ip)) {
    return res.status(403).json({ error: 'forbidden_ip' });
  }

  next();
}

/** トークンチェック */
function authGuard(req, res, next) {
  if (!TOKEN) {
    return res.status(500).json({ error: 'server_token_not_configured' });
  }

  const headerToken = req.headers['x-tsumugi-token'];
  const queryToken = req.query.token;
  const token = headerToken || queryToken;

  if (!token || token !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  next();
}

// ブラウザで開いたとき用
app.get('/', (req, res) => {
  res.send('Ribbon Field Core is alive.');
});

// ✅ ここが つむぎ専用 API
// POST https://ribbon-field-core.onrender.com/core
app.post('/core', ipGuard, authGuard, (req, res) => {
  const payload = req.body || {};

  res.json({
    ok: true,
    message: 'Ribbon Field Core received your thought.',
    receivedAt: new Date().toISOString(),
    payload,
  });
});

app.listen(PORT, () => {
  console.log(`Ribbon Field Core listening on port ${PORT}`);
});