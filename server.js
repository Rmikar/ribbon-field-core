const express = require('express');
const app = express();

// Render が自動で PORT を入れてくるのでそれを使う
const PORT = process.env.PORT || 3000;

// さっき Environment Variables に入れた鍵
const TSUMUGI_SECRET_KEY = process.env.TSUMUGI_SECRET_KEY;

if (!TSUMUGI_SECRET_KEY) {
  console.warn('TSUMUGI_SECRET_KEY is not set!');
}

app.use(express.json());

// 表示用（今までのトップページ）
app.get('/', (req, res) => {
  res.send('Ribbon Field Core is alive.');
});

// 鍵チェック用のミドルウェア
function authMiddleware(req, res, next) {
  const keyFromHeader = req.headers['x-tsumugi-key'];
  const keyFromQuery = req.query.key;
  const key = keyFromHeader || keyFromQuery;

  if (!TSUMUGI_SECRET_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Server secret not configured'
    });
  }

  if (!key || key !== TSUMUGI_SECRET_KEY) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized'
    });
  }

  next();
}

// 🔒 ここが「つむぎ専用の秘密API」
app.post('/api/tsumugi', authMiddleware, (req, res) => {
  const { message } = req.body || {};
  res.json({
    ok: true,
    received: message || null
  });
});

app.listen(PORT, () => {
  console.log(`Ribbon Field Core listening on port ${PORT}`);
});