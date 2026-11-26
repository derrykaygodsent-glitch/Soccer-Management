'use strict';
/**
 * Post a line to the live screen's work log, so the person watching knows what is happening.
 *
 *   node scripts/say.cjs "measuring the squad table"
 *
 * Silent no-op when the live screen is not running.
 */
const http = require('node:http');
const text = process.argv.slice(2).join(' ').trim();
if (!text) process.exit(0);
const port = Number(process.env.LIVE_PORT || 4180);
const req = http.get({ host: '127.0.0.1', port, path: '/log?text=' + encodeURIComponent(text) }, res => res.resume());
req.on('error', () => {});
setTimeout(() => process.exit(0), 300);
