import { useEffect, useState, useRef } from 'react';
import { fetchCards } from '../api';
import CardModal from '../components/CardModal';
import CompareModal from '../components/CompareModal';
import { bgClass } from '../utils';

const PAGE_SIZE = 6;
const MAX_COMPARE = 3;
const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'BoB'];

function CreditCardGraphic({ card }) {
  return (
    <div className={`card-graphic ${bgClass(card.issuer)}`}>
      <div className="card-graphic-top">
        <div>
          <div className="card-bank-name">{card.issuer}</div>
          <div className="card-graphic-name">{card.name}</div>
        </div>
        <span className="card-contactless">)))</span>
      </div>
      <div className="card-chip" />
      <div className="card-graphic-bottom">
        <div className="card-dots">
          <div className="dot-group"><span /><span /><span /><span /></div>
          <div className="dot-group"><span /><span /><span /><span /></div>
          <div className="dot-group"><span /><span /><span /><span /></div>
          <span style={{color:'rgba(255,255,255,0.6)', fontSize:'12px', marginLeft:'4px'}}>4829</span>
        </div>
        <div>
          <div className="card-valid">Valid Thru 08/30</div>
          <div className="card-network-logo">{card.network || 'VISA'}</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button className={`filter-chip${active ? ' active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-graphic" />
      <div className="skeleton-body">
        <div className="skeleton-fees">
          <div className="skeleton-fee-box" />
          <div className="skeleton-fee-box" />
        </div>
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-btn" />
      </div>
    </div>
  );
}

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!target || started.current) return;
    started.current = true;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function CardList() {
  const [cards, setCards]               = useState([]);
  const [visible, setVisible]           = useState(PAGE_SIZE);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [compareIds, setCompareIds]     = useState([]);
  const [showCompare, setShowCompare]   = useState(false);
  const [query, setQuery]               = useState('');
  const [bankFilter, setBankFilter]     = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [feeFilter, setFeeFilter]       = useState('');

  useEffect(() => {
    fetchCards()
      .then(setCards)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setVisible(PAGE_SIZE); }, [query, bankFilter, networkFilter, feeFilter]);

  const filteredCards = cards.filter(card => {
    if (query) {
      const q = query.toLowerCase();
      if (!card.name.toLowerCase().includes(q) && !card.issuer.toLowerCase().includes(q)) return false;
    }
    if (bankFilter && !card.issuer.toLowerCase().includes(bankFilter.toLowerCase())) return false;
    if (networkFilter && card.network !== networkFilter) return false;
    if (feeFilter === 'free' && card.fees.joining !== 0) return false;
    if (feeFilter === 'paid' && card.fees.joining === 0) return false;
    return true;
  });

  const hasActiveFilter = query || bankFilter || networkFilter || feeFilter;

  const clearFilters = () => {
    setQuery('');
    setBankFilter('');
    setNetworkFilter('');
    setFeeFilter('');
  };

  const toggleCompare = (id, e) => {
    e.stopPropagation();
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  // Animated counters
  const totalCount   = useCountUp(cards.length);
  const bankCount    = useCountUp([...new Set(cards.map(c => c.issuer))].length);
  const freeCount    = useCountUp(cards.filter(c => c.fees.joining === 0).length);

  const shown = filteredCards.slice(0, visible);
  const hasMore = visible < filteredCards.length;
  const networks = [...new Set(cards.map(c => c.network).filter(Boolean))].sort();
  const compareCardObjects = compareIds.map(id => cards.find(c => c._id === id)).filter(Boolean);

  // Build active filter tags
  const activeTags = [];
  if (query)         activeTags.push({ label: `"${query}"`,     clear: () => setQuery('') });
  if (bankFilter)    activeTags.push({ label: bankFilter,        clear: () => setBankFilter('') });
  if (networkFilter) activeTags.push({ label: networkFilter,     clear: () => setNetworkFilter('') });
  if (feeFilter)     activeTags.push({ label: feeFilter === 'free' ? 'Free to Join' : 'Paid', clear: () => setFeeFilter('') });

  if (error) return <div className="status error">{error}</div>;

  return (
    <>
      {/* ── Hero ── */}
      <div className="hero-banner">
        <div className="hero-inner">
          <div className="hero-tag">Updated for 2026 Indian Credit Card Reward Rules</div>
          <h1>Find the Credit Card That<br />Maximizes Your <span>Annual Savings</span></h1>
          <p>Compare benefits, fees, and rewards across top Indian banks — all in one place.</p>

          <div className="hero-search-wrap">
            <div className="search-input-row">
              <span className="search-icon">⌕</span>
              <input
                className="hero-search-input"
                type="text"
                placeholder="Search by card name or bank (e.g. HDFC, cashback)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button className="search-clear-x" onClick={() => setQuery('')} aria-label="Clear search">×</button>
              )}
            </div>
          </div>

          <div className="hero-stats">
            <div className="hero-stat"><strong>{loading ? '—' : totalCount}</strong><span>Cards Listed</span></div>
            <div className="hero-stat"><strong>{loading ? '—' : bankCount}</strong><span>Banks</span></div>
            <div className="hero-stat"><strong>{loading ? '—' : freeCount}</strong><span>Free to Join</span></div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="filter-bar-inner">
          <div className="filter-group">
            <span className="filter-group-label">Bank</span>
            <div className="chip-row">
              {BANKS.map(b => (
                <Chip key={b} label={b} active={bankFilter === b} onClick={() => setBankFilter(bankFilter === b ? '' : b)} />
              ))}
            </div>
          </div>
          <div className="filter-divider" />
          <div className="filter-group">
            <span className="filter-group-label">Network</span>
            <div className="chip-row">
              {networks.map(n => (
                <Chip key={n} label={n} active={networkFilter === n} onClick={() => setNetworkFilter(networkFilter === n ? '' : n)} />
              ))}
            </div>
          </div>
          <div className="filter-divider" />
          <div className="filter-group">
            <span className="filter-group-label">Fee</span>
            <div className="chip-row">
              <Chip label="Free to Join" active={feeFilter === 'free'} onClick={() => setFeeFilter(feeFilter === 'free' ? '' : 'free')} />
              <Chip label="Paid" active={feeFilter === 'paid'} onClick={() => setFeeFilter(feeFilter === 'paid' ? '' : 'paid')} />
            </div>
          </div>
          {hasActiveFilter && (
            <button className="filter-clear-all" onClick={clearFilters}>✕ Clear all</button>
          )}
        </div>

        {/* Active filter tags */}
        {activeTags.length > 0 && (
          <div className="active-filters">
            {activeTags.map(tag => (
              <span key={tag.label} className="active-filter-tag">
                {tag.label}
                <button onClick={tag.clear} aria-label={`Remove ${tag.label}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Card grid ── */}
      <main className="app-main">
        <div className="app-main-inner">
          <div className="section-heading">
            <h2>{hasActiveFilter ? 'Filtered Results' : 'All Credit Cards'}</h2>
            <span className="card-count">
              {loading ? '...' : `${filteredCards.length}${hasActiveFilter && filteredCards.length !== cards.length ? ` of ${cards.length}` : ''} cards`}
            </span>
          </div>

          {loading ? (
            <div className="skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No cards match your filters.</p>
              <button className="clear-btn-lg" onClick={clearFilters}>Clear all filters</button>
            </div>
          ) : (
            <div className="card-grid">
              {shown.map(card => {
                const inCompare = compareIds.includes(card._id);
                const compareFull = compareIds.length >= MAX_COMPARE && !inCompare;
                return (
                  <div
                    key={card._id}
                    className={`card-item${inCompare ? ' in-compare' : ''}`}
                    onClick={() => setSelected(card._id)}
                  >
                    <CreditCardGraphic card={card} />
                    <div className="card-body">
                      <div className="card-fees-row">
                        <div className="fee-pill">
                          <span className="fee-label">Joining Fee</span>
                          <span className={`fee-value ${card.fees.joining === 0 ? 'free' : ''}`}>
                            {card.fees.joining === 0 ? 'FREE' : `₹${card.fees.joining}`}
                          </span>
                        </div>
                        <div className="fee-pill">
                          <span className="fee-label">Annual Fee</span>
                          <span className={`fee-value ${card.fees.annual === 0 ? 'free' : ''}`}>
                            {card.fees.annual === 0 ? 'FREE' : `₹${card.fees.annual}`}
                          </span>
                        </div>
                      </div>
                      <ul className="card-benefits">
                        <li>{card.rewards.base_rate}</li>
                      </ul>
                      <div className="card-actions">
                        <button className="view-details-btn" onClick={e => { e.stopPropagation(); setSelected(card._id); }}>
                          View Details
                        </button>
                        <button
                          className={`compare-toggle-btn${inCompare ? ' added' : ''}${compareFull ? ' disabled' : ''}`}
                          onClick={e => toggleCompare(card._id, e)}
                          disabled={compareFull}
                          title={compareFull ? `Max ${MAX_COMPARE} cards` : inCompare ? 'Remove from compare' : 'Add to compare'}
                        >
                          {inCompare ? '✓ Added' : '+ Compare'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                Load More Cards ({filteredCards.length - visible} remaining)
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Compare tray ── */}
      {compareIds.length > 0 && (
        <div className="compare-tray">
          <div className="compare-tray-slots">
            {compareCardObjects.map(card => (
              <div key={card._id} className="compare-tray-card">
                <div className={`compare-tray-thumb ${bgClass(card.issuer)}`}>
                  <span>{card.issuer[0]}</span>
                </div>
                <div className="compare-tray-name">
                  <span className="compare-tray-issuer">{card.issuer}</span>
                  <span className="compare-tray-card-name">{card.name}</span>
                </div>
                <button
                  className="compare-tray-remove"
                  onClick={() => setCompareIds(prev => prev.filter(x => x !== card._id))}
                  aria-label="Remove"
                >×</button>
              </div>
            ))}
            {Array.from({ length: MAX_COMPARE - compareIds.length }, (_, i) => (
              <div key={`empty-${i}`} className="compare-tray-empty">+ Add card</div>
            ))}
          </div>
          <div className="compare-tray-actions">
            <span className="compare-tray-hint">{compareIds.length} of {MAX_COMPARE} selected</span>
            <button
              className="compare-tray-btn"
              disabled={compareIds.length < 2}
              onClick={() => setShowCompare(true)}
            >
              Compare Now
            </button>
            <button className="compare-tray-clear" onClick={() => setCompareIds([])}>Clear</button>
          </div>
        </div>
      )}

      {selected && <CardModal cardId={selected} onClose={() => setSelected(null)} />}
      {showCompare && <CompareModal cardIds={compareIds} onClose={() => setShowCompare(false)} />}
    </>
  );
}
