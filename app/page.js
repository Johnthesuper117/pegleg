'use client';

import { useMemo, useState } from 'react';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState('all');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const terminalStatus = useMemo(() => {
    if (loading) return 'searching index...';
    if (!hasSearched) return 'ready';
    if (!activeQuery) return `showing ${results.length} of ${total} results`;
    return `showing ${results.length} of ${total} results for "${activeQuery}"`;
  }, [loading, hasSearched, activeQuery, results.length, total]);

  async function runSearch(nextQuery = query, nextSource = source) {
    const trimmed = nextQuery.trim();
    setActiveQuery(trimmed);
    setHasSearched(true);
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      if (nextSource !== 'all') params.set('source', nextSource);

      const response = await fetch(`/api/games?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      const payload = await response.json();

      setResults(payload.results || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setTotal(0);
      setError('search failed - try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="terminal">
        <header className="header">
          <strong>thepegleg // game terminal</strong>
          <span className="prompt">$ {terminalStatus}</span>
        </header>

        <div className="searchRow">
          <input
            className="searchInput"
            type="text"
            value={query}
            placeholder="Search ~200,000+ games..."
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
          />
          <button className="searchButton" onClick={() => runSearch()} type="button">
            search
          </button>
        </div>

        <div className="searchRow" style={{ gridTemplateColumns: '1fr' }}>
          <select
            className="select"
            value={source}
            onChange={(event) => {
              const value = event.target.value;
              setSource(value);
              if (activeQuery || results.length) runSearch(query, value);
            }}
          >
            <option value="all">all systems/sources</option>
            <option value="crazygames">crazygames</option>
            <option value="coolmath">coolmath</option>
            <option value="nettleweb">nettleweb</option>
            <option value="gb">game boy</option>
            <option value="gba">game boy advance</option>
            <option value="gbc">game boy color</option>
            <option value="n64">nintendo 64</option>
            <option value="nds">nintendo ds</option>
            <option value="genesis">sega genesis</option>
            <option value="mame2003">mame 2003</option>
            <option value="~pegleg/3kh0">~pegleg/3kh0</option>
            <option value="~selenite">~selenite</option>
            <option value="~native">~native</option>
          </select>
        </div>

        <p className="meta">Search + index data are preserved from existing atlas/caches; UV proxy removed.</p>
        {error && <p className="meta">{error}</p>}

        <div className="results">
          {results.map((game) => (
            <div className="result" key={`${game.source}-${game.title}-${game.href}`}>
              <a href={game.href} target="_blank" rel="noreferrer">
                {game.title}
              </a>
              <small>{game.source}</small>
            </div>
          ))}
          {!loading && results.length === 0 && (
            <div className="result">
              <span>No results yet. Search to start.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
