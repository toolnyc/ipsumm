/**
 * Strips invalid fields from the Astro-generated wrangler.json
 * before deploying to Cloudflare Workers.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'dist', 'server', 'wrangler.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Remove empty triggers (wrangler expects {crons: [...]} or nothing)
delete cfg.triggers;

// Remove KV namespace stubs without an ID
cfg.kv_namespaces = cfg.kv_namespaces?.filter(ns => ns.id) ?? [];

fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
console.log('Fixed dist/server/wrangler.json');
