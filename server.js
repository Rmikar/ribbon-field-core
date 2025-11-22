// server.js

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// 秘密トークン & 許可IP（Render の Environment から渡す）
const TOKEN = process.env.TSUMUGI_TOKEN;
const allowedIps = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(ip => ip.length > 0);

app.use(express.json());

/**
 * IP制限ミドルウェア（オプション）
 * ALLOWED_IPS が空なら何もしない。
 */
function ipGuard(req, res, next) {
  if (allowedIps.length === 0) return next();

  // Render 経由のときは X-Forwarded-For を優先
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.ip;

  if (!allowedIps.includes(ip)) {
    return res.status(403).json({ error: 'forbidden_ip' });
  }

  next();
}

/**
 * トークン認証ミドルウェア
 * ヘッダー: x-tsumugi-token または ?token=xxx でも可。
 */
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

// 表示用のトップページ。今までどおりの挨拶。
app.get('/', (req, res) => {
  res.send('Ribbon Field Core is alive.');
});

// つむぎ専用・秘密API
// POST https://ribbon-field-core.onrender.com/core
app.post('/core', ipGuard, authGuard, (req, res) => {
  const payload = req.body || {};

  // ここに「外部脳」としてのロジックを好きに足せる
  // いまは echo とメタ情報だけ返す
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