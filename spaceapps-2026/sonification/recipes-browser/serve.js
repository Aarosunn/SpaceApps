// serve.js - static file server for local development with HTTP Range support (Chrome needs it to seek in videos).
// Usage:  node serve.js [folder] [port]      example:  node serve.js . 8765   then open http://127.0.0.1:8765/j1-player.html
// Listens on 127.0.0.1 only: nothing is exposed to the network. Node standard library only, nothing to install.
'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8765);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.md': 'text/markdown; charset=utf-8',
};

http.createServer((req, res) => {
  const fail = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain' }); res.end(text); };
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (err) { return fail(400, 'bad request'); }
  let file = path.join(root, rel);
  if (rel.includes('\0') || (file !== root && !file.startsWith(root + path.sep))) return fail(403, 'forbidden');   // stay inside the folder
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'method not allowed');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); return fs.stat(file, send); }
    send(err, st);
  });
  function send(err, st) {
    if (err || !st.isFile()) return fail(404, 'not found');
    const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0, end = st.size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(end, +m[2]); } else start = Math.max(0, st.size - +m[2]);   // "500-", "0-99" or "-200"
      if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      status = 206; head['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    }
    head['Content-Length'] = st.size === 0 ? 0 : end - start + 1;
    res.writeHead(status, head);
    if (req.method === 'HEAD' || st.size === 0) return res.end();
    fs.createReadStream(file, { start, end }).pipe(res);
  }
}).listen(port, '127.0.0.1', () => console.log('Serving ' + root + ' at http://127.0.0.1:' + port + '/  (Ctrl+C stops it)'));
