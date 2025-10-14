import http from 'http';
import handler from './api/index.js';

const PORT = 3000;

// Wrapper to make Node.js res compatible with Vercel's API
function wrapResponse(res) {
  if (!res.status) {
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      this.setHeader('content-type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(data));
      return this;
    };
  }
  return res;
}

const server = http.createServer((req, res) => {
  handler(req, wrapResponse(res));
});

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`\nTesta endpoints:`);
  console.log(`  • http://localhost:${PORT}/api/transcript?videoId=dQw4w9WgXcQ`);
  console.log(`  • http://localhost:${PORT}/api/bulk/channel?handle=mkbhd&max=5`);
  console.log(`  • http://localhost:${PORT}/api/bulk/playlist?list=PLxxxxxxx&max=5`);
});

