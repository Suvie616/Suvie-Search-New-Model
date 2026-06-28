// index_local.js - recursively index files under a directory into data.json
// Usage: node index_local.js /path/to/scan

const fs = require('fs');
const path = require('path');

function walk(dir, exts = ['.html','.htm','.md','.txt','.js','.css']) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      out.push(...walk(p, exts));
    } else {
      if (exts.includes(path.extname(it.name).toLowerCase())) out.push(p);
    }
  }
  return out;
}

function extractTitle(content, filePath) {
  const m = content.match(/<title>([^<]+)<\/title>/i);
  if (m) return m[1].trim();
  const firstLine = content.split(/\r?\n/).find(l => l.trim());
  return firstLine ? firstLine.slice(0, 80) : path.basename(filePath);
}

function buildIndex(root) {
  const files = walk(root);
  const docs = files.map((f, i) => {
    const content = fs.readFileSync(f, 'utf8');
    return { id: String(i+1), title: extractTitle(content, f), url: `file://${f}`, content: content.slice(0, 5000) };
  });
  fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(docs, null, 2));
  console.log(`Indexed ${docs.length} files into data.json`);
}

const root = process.argv[2] || process.cwd();
buildIndex(root);
