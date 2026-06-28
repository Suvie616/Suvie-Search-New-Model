const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Load local index
let LOCAL_INDEX = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
  LOCAL_INDEX = JSON.parse(raw);
} catch (e) {
  console.warn('Could not load local data.json:', e.message);
}

app.use(express.static(__dirname));

function localSearch(q) {
  const qLow = q.toLowerCase();
  return LOCAL_INDEX
    .map(doc => ({...doc, score: ((doc.title||'').toLowerCase().includes(qLow)?10:0) + (((doc.content||'').toLowerCase().includes(qLow)?3:0))}))
    .filter(d => d.score>0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 20)
    .map(d => ({title: d.title, url: d.url, snippet: d.content, source: 'local'}));
}

app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const start = parseInt(req.query.start || '0', 10) || 0;
  const num = Math.min(parseInt(req.query.num || '10', 10) || 10, 50);
  if (!q) return res.json({results: []});

  const serpapiKey = process.env.SERPAPI_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const googleCx = process.env.GOOGLE_CX;
  let webResults = [];
  if (serpapiKey) {
    // Prefer Google Custom Search if configured; otherwise use SerpAPI
  }
  if (googleKey && googleCx) {
    try {
      // Google Custom Search: start is 1-based
      const gStart = Math.max(1, start + 1);
      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(q)}&start=${encodeURIComponent(gStart)}&num=${encodeURIComponent(num)}`;
      const r = await fetch(googleUrl, { timeout: 10000 });
      const j = await r.json();
      const items = j.items || [];
      webResults = items.map(item => ({
        title: item.title || '',
        url: item.link || '#',
        snippet: item.snippet || item.htmlSnippet || '',
        source: 'google'
      }));
      // attach paging hints
      webResults.pagination = {totalResults: j.searchInformation && j.searchInformation.totalResults};
    } catch (err) {
      console.error('Google Custom Search request failed', err.message);
      // fallback to SerpAPI if available
      if (serpapiKey) {
        try {
          const serpUrl = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(serpapiKey)}&num=${encodeURIComponent(num)}&start=${encodeURIComponent(start)}`;
          const r2 = await fetch(serpUrl, { timeout: 10000 });
          const j2 = await r2.json();
          const organic = j2.organic_results || j2.organic || [];
          webResults = organic.slice(0, num).map(item => ({
            title: item.title || item.snippet || item.position || 'Result',
            url: item.link || item.source || item.url || '#',
            snippet: item.snippet || item.snippet_text || '',
            source: 'serpapi'
          }));
        } catch (err2) {
          console.error('SerpAPI fallback failed', err2.message);
        }
      }
    }
  }

  const local = localSearch(q);

  // Merge web + local, prefer web first
  const combined = [].concat(webResults, local).slice(0, 50);
  res.json({results: combined, web: webResults, local: local, start, num});
});

app.listen(PORT, () => console.log(`Suvie Search server running on http://localhost:${PORT}`));
