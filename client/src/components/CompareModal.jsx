import { useEffect, useState } from 'react';
import { fetchCard } from '../api';
import { bgClass } from '../utils';

const ROWS = [
  { label: 'Issuer',       get: c => c.issuer },
  { label: 'Network',      get: c => c.network || '—' },
  { label: 'Joining Fee',  get: c => c.fees.joining === 0 ? 'FREE' : `₹${c.fees.joining} + GST` },
  { label: 'Annual Fee',   get: c => c.fees.annual  === 0 ? 'FREE' : `₹${c.fees.annual} + GST` },
  { label: 'Base Reward',  get: c => c.rewards.base_rate },
  { label: 'Min Age',      get: c => c.eligibility?.min_age ? `${c.eligibility.min_age} yrs` : '—' },
  { label: 'Min Income',   get: c => c.eligibility?.min_monthly_income ? `₹${c.eligibility.min_monthly_income.toLocaleString('en-IN')}/mo` : '—' },
];

export default function CompareModal({ cardIds, onClose }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(cardIds.map(id => fetchCard(id)))
      .then(setCards)
      .finally(() => setLoading(false));

    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [cardIds, onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compare-box">
        <div className="compare-header">
          <h2>Compare Cards</h2>
          <button className="compare-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="status">Loading...</div>
        ) : (
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="compare-row-label" />
                  {cards.map(card => (
                    <th key={card._id} className="compare-card-head">
                      <div className={`compare-card-banner ${bgClass(card.issuer)}`}>
                        <div className="compare-card-issuer">{card.issuer}</div>
                        <div className="compare-card-name">{card.name}</div>
                        {card.network && <span className="compare-card-network">{card.network}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(row => (
                  <tr key={row.label} className="compare-row">
                    <td className="compare-row-label">{row.label}</td>
                    {cards.map(card => {
                      const val = row.get(card);
                      const isFree = val === 'FREE';
                      return (
                        <td key={card._id} className={`compare-cell${isFree ? ' free' : ''}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Accelerated categories */}
                {cards.some(c => c.rewards.categories?.length) && (
                  <>
                    <tr className="compare-section-row">
                      <td colSpan={cards.length + 1}>Bonus Categories</td>
                    </tr>
                    {(() => {
                      const maxCats = Math.max(...cards.map(c => c.rewards.categories?.length || 0));
                      return Array.from({ length: maxCats }, (_, i) => (
                        <tr key={`cat-${i}`} className="compare-row">
                          <td className="compare-row-label">Category {i + 1}</td>
                          {cards.map(card => {
                            const cat = card.rewards.categories?.[i];
                            return (
                              <td key={card._id} className="compare-cell">
                                {cat ? (
                                  <>
                                    <span className="compare-cat-name">{cat.merchant}</span>
                                    <span className="compare-rate-badge">{cat.rate}</span>
                                  </>
                                ) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </>
                )}
                {/* Perks count */}
                <tr className="compare-row">
                  <td className="compare-row-label">Perks</td>
                  {cards.map(card => (
                    <td key={card._id} className="compare-cell">
                      {card.perks?.length ? `${card.perks.length} benefits` : '—'}
                    </td>
                  ))}
                </tr>
                {/* CTA row */}
                <tr className="compare-row">
                  <td className="compare-row-label" />
                  {cards.map(card => (
                    <td key={card._id} className="compare-cell">
                      <a
                        href={card.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compare-apply-btn"
                      >
                        Apply ↗
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
