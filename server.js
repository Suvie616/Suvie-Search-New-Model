const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Load indexes from local files and crawl output
const LOCAL_INDEX_PATH = path.join(__dirname, 'data.json');
const CRAWL_INDEX_PATH = path.join(__dirname, 'crawl_output.json');

function loadIndexFromFile(filePath, source) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const docs = JSON.parse(raw);
    return Array.isArray(docs)
      ? docs.map(doc => ({ ...doc, source }))
      : [];
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn(`Could not load ${path.basename(filePath)}:`, e.message);
    }
    return [];
  }
}

const LOCAL_INDEX = loadIndexFromFile(LOCAL_INDEX_PATH, 'local');
const CRAWL_INDEX = loadIndexFromFile(CRAWL_INDEX_PATH, 'crawl');
const SEARCH_INDEX = LOCAL_INDEX.concat(CRAWL_INDEX);

app.use(express.static(__dirname));

function localSearch(q) {
  const qLow = q.toLowerCase();
  return SEARCH_INDEX
    .map(doc => ({
      ...doc,
      score:
        ((doc.title||'').toLowerCase().includes(qLow) ? 10 : 0) +
        ((doc.content||'').toLowerCase().includes(qLow) ? 3 : 0)
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(d => ({title: d.title, url: d.url, snippet: d.content, source: d.source || 'local'}));
}

app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const start = parseInt(req.query.start || '0', 10) || 0;
  const num = Math.min(parseInt(req.query.num || '10', 10) || 10, 50);
  if (!q) return res.json({results: []});

  const serpapiKey = process.env.SERPAPI_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const googleCx = process.env.GOOGLE_CX;
  const provider = (process.env.PROVIDER || '').toLowerCase();
  let webResults = [];

  async function fetchSerpApiResults() {
    try {
      const serpUrl = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(serpapiKey)}&num=${encodeURIComponent(num)}&start=${encodeURIComponent(start)}`;
      const r2 = await fetch(serpUrl, { timeout: 10000 });
      const j2 = await r2.json();
      const organic = j2.organic_results || j2.organic || [];
      return organic.slice(0, num).map(item => ({
        title: item.title || item.snippet || item.position || 'Result',
        url: item.link || item.source || item.url || '#',
        snippet: item.snippet || item.snippet_text || '',
        source: 'serpapi'
      }));
    } catch (err2) {
      console.error('SerpAPI request failed', err2.message);
      return [];
    }
  }

  async function fetchGoogleResults() {
    try {
      const gStart = Math.max(1, start + 1);
      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(q)}&start=${encodeURIComponent(gStart)}&num=${encodeURIComponent(num)}`;
      const r = await fetch(googleUrl, { timeout: 10000 });
      const j = await r.json();
      const items = j.items || [];
      const results = items.map(item => ({
        title: item.title || '',
        url: item.link || '#',
        snippet: item.snippet || item.htmlSnippet || '',
        source: 'google'
      }));
      results.pagination = { totalResults: j.searchInformation && j.searchInformation.totalResults };
      return results;
    } catch (err) {
      console.error('Google Custom Search request failed', err.message);
      return [];
    }
  }

  if (provider === 'serpapi' && serpapiKey) {
    webResults = await fetchSerpApiResults();
  } else if (provider === 'google' && googleKey && googleCx) {
    webResults = await fetchGoogleResults();
  } else if (googleKey && googleCx) {
    webResults = await fetchGoogleResults();
    if (webResults.length === 0 && serpapiKey) {
      webResults = await fetchSerpApiResults();
    }
  } else if (serpapiKey) {
    webResults = await fetchSerpApiResults();
  }

  const local = localSearch(q);

  // Merge web + local, prefer web first
  const combined = [].concat(webResults, local).slice(0, 50);
  res.json({results: combined, web: webResults, local: local, start, num});
});

app.listen(PORT, () => console.log(`Suvie Search server running on http://localhost:${PORT}`));
