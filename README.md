Suvie Search
===============

Lightweight client-side search demo.

How to use

- Open [index.html](index.html) in your browser.
- Type queries in the search box; results come from `data.json`.

Running with SerpAPI (recommended for web results)

1. Get a SerpAPI key from https://serpapi.com/ and copy it.
2. Create a `.env` file next to `server.js` and set `SERPAPI_KEY=your_key_here` (or rename `.env.example`).
3. Install dependencies and start the server:

```bash
npm install
npm start
```

4. Open http://localhost:8000 in your browser. The frontend will call `/api/search?q=...`.

Google Custom Search setup:

- Create a Programmable Search Engine at https://cse.google.com/
- Set it to search the entire web or the sites you want.
- Copy the Search Engine ID (`GOOGLE_CX`).
- Put both `GOOGLE_API_KEY` and `GOOGLE_CX` in `.env`.
- Restart the server.

Pagination: the server supports `start` and `num` parameters. The frontend provides simple Previous/Next controls when web results are available.

Additional features added
- Google Custom Search support: set `GOOGLE_API_KEY` and `GOOGLE_CX` in `.env` to enable.
- `crawler.js`: a small seed-based crawler to harvest pages into `crawl_output.json` (for testing only).
- `index_local.js`: recursively index a local folder (e.g., your workspace or OneDrive) into `data.json`.

Security & privacy
- Indexing local files reads files from the directories you specify. Do not run `index_local.js` on private directories you don't want indexed.

Usage examples

Index local workspace:

```bash
node index_local.js "C:/Users/suuwe/OneDrive/Desktop/CODES"
```

Crawl a site (small test):

```bash
C:/Users/suuwe/AppData/Local/Python/pythoncore-3.14-64/python.exe run_crawler.py https://example.com 50
```

Then the crawler output is loaded automatically from `crawl_output.json` by the server.

Switch to Google Custom Search by adding credentials to `.env` then restart the server.

If you don't run the server, the frontend will still use the local `data.json` index only.

Files
- `index.html` — frontend UI
- `script.js` — client-side search logic
- `style.css` — styles
- `data.json` — sample index

Notes
- This is a static demo. For larger datasets or server-powered search, add a backend API (Flask/Node) to host a searchable index.
