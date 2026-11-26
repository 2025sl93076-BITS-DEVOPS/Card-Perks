import { useEffect, useState } from 'react';
import { fetchCard } from '../api';
import { bgClass } from '../utils';

export default function CardModal({ cardId, onClose }) {
  const [card, setCard]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetchCard(cardId)
      .then(setCard)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    // close on Escape
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [cardId, onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {loading && <div className="status">Loading...</div>}
        {error   && <div className="status error">{error}</div>}
        {card && (
          <>
            <div className={`modal-hero ${bgClass(card.issuer)}`}>
              <button className="modal-close" onClick={onClose}>×</button>
              <div className="modal-issuer-row">
                <span className="card-issuer-badge">{card.issuer}</span>
                {card.network && <span className="card-network">{card.network}</span>}
              </div>
              <h1>{card.name}</h1>
              <p className="hero-subtitle">Last verified: {card.last_verified}</p>
              <div className="modal-fees-row">
                <div className="modal-fee-box">
                  <span className="fee-label">Joining Fee</span>
                  <span className={`fee-value ${card.fees.joining === 0 ? 'free' : ''}`}>
                    {card.fees.joining === 0 ? 'FREE' : `₹${card.fees.joining} + GST`}
                  </span>
                </div>
                <div className="modal-fee-box">
                  <span className="fee-label">Annual Fee</span>
                  <span className={`fee-value ${card.fees.annual === 0 ? 'free' : ''}`}>
                    {card.fees.annual === 0 ? 'FREE' : `₹${card.fees.annual} + GST`}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-content">
              <div className="modal-section">
                <h2>🎁 Reward Rate Structure</h2>
                <div className="base-rate-box">{card.rewards.base_rate}</div>
                {card.rewards.categories?.length > 0 && (
                  <table className="rewards-table">
                    <thead>
                      <tr>
                        <th>Merchant / Category</th>
                        <th>Rate</th>
                        <th>Cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {card.rewards.categories.map((c, i) => (
                        <tr key={i}>
                          <td>{c.merchant}</td>
                          <td><span className="rate-badge">{c.rate}</span></td>
                          <td>{c.cap || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {card.eligibility && (card.eligibility.min_age || card.eligibility.min_monthly_income || card.eligibility.notes) && (
                <div className="modal-section">
                  <h2>✅ Eligibility Criteria</h2>
                  <div className="eligibility-grid">
                    {card.eligibility.min_age && (
                      <div className="eligibility-item">
                        <div className="label">Age Requirement</div>
                        <div className="value">{card.eligibility.min_age}–65 Years</div>
                      </div>
                    )}
                    {card.eligibility.min_monthly_income && (
                      <div className="eligibility-item">
                        <div className="label">Min. Income</div>
                        <div className="value">₹{card.eligibility.min_monthly_income.toLocaleString('en-IN')}/mo</div>
                      </div>
                    )}
                  </div>
                  {card.eligibility.notes && (
                    <div className="eligibility-notes">{card.eligibility.notes}</div>
                  )}
                </div>
              )}

              {card.perks?.length > 0 && (
                <div className="modal-section">
                  <h2>⭐ Perks & Benefits</h2>
                  <ul className="perks-list">
                    {card.perks.map((perk, i) => <li key={i}>{perk}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <span className="source-link">
                Source: <a href={card.source} target="_blank" rel="noopener noreferrer">Official page ↗</a>
              </span>
              <a href={card.source} target="_blank" rel="noopener noreferrer" className="check-eligibility-btn">
                Check Eligibility ↗
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
