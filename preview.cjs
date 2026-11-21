'use strict';

const { createServer } = require('node:http');
const { readFile } = require('node:fs');
const { join } = require('node:path');

const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const index = join(__dirname, 'index.html');

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const path = (request.url || '/').split('?', 1)[0];
  if (path === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  if (path !== '/' && path !== '/index.html' && path !== '/offline-worker.js') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const worker = path === '/offline-worker.js';
  readFile(worker ? join(__dirname,'offline-worker.js') : index, (error, page) => {
    if (error) {
      console.error(error.message);
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Build index.html with npm run build, then reload.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': worker ? 'application/javascript' : 'text/html; charset=utf-8',
      'Content-Length': page.length,
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : page);
  });
});

server.on('error', error => {
  console.error(`Unable to start the Touchline 26 preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => console.log(`Touchline 26 ready on port ${port}`));
