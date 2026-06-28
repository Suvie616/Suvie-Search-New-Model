// Simple crawler skeleton - for small-scale use and testing only
// Usage: node crawler.js https://example.com

const fetch = require('node-fetch');
const fs = require('fs');
const { URL } = require('url');

async function fetchText(url) {
  try {
    const r = await fetch(url, { timeout: 10000 });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
}

function extractLinks(base, html) {
  const re = /href\s*=\s*"([^"]+)"/ig;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], base).href;
      if (u.startsWith(base)) links.add(u);
    } catch (e) {}
  }
  return Array.from(links);
}

async function crawl(seed, maxPages = 50) {
  const visited = new Set();
  const queue = [seed];
  const out = [];
  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    const html = await fetchText(url);
    if (!html) continue;
    out.push({url, content: html.slice(0, 3000)});
    const links = extractLinks(new URL(seed).origin, html);
    for (const l of links) if (!visited.has(l) && !queue.includes(l)) queue.push(l);
  }
  fs.writeFileSync('crawl_output.json', JSON.stringify(out, null, 2));
  console.log('Crawl finished, saved to crawl_output.json');
}

const seed = process.argv[2];
if (!seed) {
  console.log('Usage: node crawler.js <seed-url>');
  process.exit(1);
}

crawl(seed).catch(err => console.error(err));
