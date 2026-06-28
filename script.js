// Suvie Search - simple client-side search
let INDEX = [];
let CURRENT_START = 0;
let CURRENT_NUM = 10;
let CURRENT_PROVIDER = '';

function loadIndex() {
	return fetch('data.json')
		.then(r => r.json())
		.then(data => { INDEX = data; })
		.catch(err => { console.error('Failed to load index', err); });
}

function tokenize(text) {
	return (text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreDocument(doc, qTokens) {
	let score = 0;
	const title = (doc.title||'').toLowerCase();
	const content = (doc.content||'').toLowerCase();
	for (const t of qTokens) {
		if (title.includes(t)) score += 10;
		if (content.includes(t)) score += 3;
		// token frequency bump
		const re = new RegExp(t, 'g');
		const matches = (content.match(re) || []).length;
		score += matches;
	}
	return score;
}

function renderResults(results, query, meta) {
	const resultsEl = document.getElementById('results');
	resultsEl.innerHTML = '';
	if (!query) {
		resultsEl.innerHTML = '<p class="help">Type to search the local index.</p>';
		return;
	}
	if (!results || results.length === 0) {
		const info = document.getElementById('search-info');
		if (info) info.textContent = `No results for "${query}"`;
		resultsEl.innerHTML = `<p class="none">No results for "${escapeHtml(query)}"</p><p class="hint">If your results don't show up, try Google search.</p>`;
		renderPagination(0, 0);
		return;
	}
	const info = document.getElementById('search-info');
	if (info) {
		info.textContent = `${results.length} results for "${query}"`;
	}
	const ul = document.createElement('ul');
	ul.className = 'result-list';
	const qTokens = tokenize(query);
	for (const r of results) {
		const li = document.createElement('li');
		li.className = 'result-item';
		const a = document.createElement('a');
		a.href = r.url || '#';
		a.target = '_blank';
		a.rel = 'noopener';
		a.innerHTML = `<strong class="title">${highlight(escapeHtml(r.title||''), qTokens)}</strong>`;

		const urlLine = document.createElement('div');
		urlLine.className = 'result-url';
		urlLine.textContent = r.url || '';

		const snippet = document.createElement('p');
		snippet.className = 'snippet';
		snippet.innerHTML = highlight(escapeHtml(r.snippet || r.content || ''), qTokens);

		const source = document.createElement('div');
		source.className = 'source-label';
		source.textContent = r.source ? `Source: ${r.source}` : '';

		li.appendChild(a);
		li.appendChild(urlLine);
		li.appendChild(snippet);
		li.appendChild(source);
		ul.appendChild(li);
	}
	resultsEl.appendChild(ul);
	renderPagination(meta && meta.start, meta && meta.num);
}

function escapeHtml(s) {
	return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function makeSnippet(text, q) {
	const qLow = q.toLowerCase();
	const idx = text.toLowerCase().indexOf(qLow);
	if (idx === -1) return text.slice(0, 150) + (text.length>150? '…':'');
	const start = Math.max(0, idx - 40);
	const end = Math.min(text.length, idx + q.length + 80);
	return (start>0? '…':'') + text.slice(start, end) + (end<text.length? '…':'');
}

function highlight(text, qTokens) {
	if (!qTokens || qTokens.length === 0) return text;
	// simple token highlight
	for (const t of qTokens) {
		const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(`(${esc})`, 'ig');
		text = text.replace(re, '<mark>$1</mark>');
	}
	return text;
}

function doSearch(query, provider = '') {
	const q = (query || '').trim();
	const qTokens = tokenize(q);
	if (qTokens.length === 0) {
		renderResults([], '');
		return;
	}
	// Try server-side (Google or SerpAPI) first; if unavailable, fall back to local search
	const providerParam = provider || CURRENT_PROVIDER || '';
	let url = `/api/search?q=${encodeURIComponent(q)}&start=${encodeURIComponent(CURRENT_START)}&num=${encodeURIComponent(CURRENT_NUM)}`;
	if (providerParam) {
		url += `&provider=${encodeURIComponent(providerParam)}`;
	}
	fetch(url)
		.then(r => {
			if (!r.ok) throw new Error('server');
			return r.json();
		})
		.then(json => {
			// json.results is an array of {title,url,snippet,source}
			renderResults(json.results || [], query, {start: json.start||0, num: json.num||CURRENT_NUM});
		})
		.catch(() => {
			const scored = INDEX.map(doc => ({doc, score: scoreDocument(doc, qTokens)}))
				.filter(x => x.score>0)
				.sort((a,b) => b.score - a.score)
				.slice(0, 50)
				.map(x => x.doc);
			// mark local results with source field for display
			const mapped = scored.map(d => ({title: d.title, url: d.url, snippet: d.content, source: 'local'}));
			renderResults(mapped, query, {start: 0, num: mapped.length});
		});
}

function hookUI() {
	const input = document.getElementById('search-input');
	const clearBtn = document.getElementById('clear-btn');
	const googleBtn = document.getElementById('google-btn');
	let timeout = null;
	input.addEventListener('input', () => {
		clearTimeout(timeout);
		CURRENT_PROVIDER = '';
		timeout = setTimeout(() => { CURRENT_START = 0; doSearch(input.value); }, 180);
	});
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') { input.value = ''; doSearch(''); }
		if (e.key === 'Enter') { e.preventDefault(); CURRENT_START = 0; doSearch(input.value); }
	});
	clearBtn.addEventListener('click', () => { input.value=''; input.focus(); doSearch(''); });
	if (googleBtn) {
		googleBtn.addEventListener('click', () => {
			CURRENT_PROVIDER = 'google';
			doSearch(input.value, 'google');
		});
	}
}

function renderPagination(start, num) {
	const container = document.getElementById('pagination');
	if (!container) return;
	container.innerHTML = '';
	const prev = document.createElement('button');
	prev.textContent = 'Previous';
	prev.disabled = !start || start <= 0;
	prev.addEventListener('click', () => {
		CURRENT_START = Math.max(0, (start || 0) - (num || CURRENT_NUM));
		doSearch(document.getElementById('search-input').value);
	});
	const next = document.createElement('button');
	next.textContent = 'Next';
	next.addEventListener('click', () => {
		CURRENT_START = (start || 0) + (num || CURRENT_NUM);
		doSearch(document.getElementById('search-input').value);
	});
	container.appendChild(prev);
	const info = document.createElement('span');
	info.className = 'page-info';
	info.textContent = `  Showing ${start||0} - ${((start||0)+(num||CURRENT_NUM))}`;
	container.appendChild(info);
	container.appendChild(next);
}

document.addEventListener('DOMContentLoaded', async () => {
	await loadIndex();
	hookUI();
});

