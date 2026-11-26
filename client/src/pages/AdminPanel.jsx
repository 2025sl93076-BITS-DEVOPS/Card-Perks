import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
  };
}

// ── Toast notification system ──
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : '✕'}
          </span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

const EMPTY_FORM = {
  name: '', issuer: '', network: '', slug: '',
  fees: { joining: 0, annual: 0 },
  rewards: { base_rate: '', categories: [] },
  perks: [],
  eligibility: { min_age: '', min_monthly_income: '' },
  source: '',
  last_verified: '',
};

export default function AdminPanel() {
  const [cards, setCards]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [tab, setTab]           = useState('cards'); // 'cards' | 'extract'
  const [rawText, setRawText]   = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted]   = useState(null);
  const [extractError, setExtractError] = useState('');
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/cards`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setCards(data);
    } catch {
      setError('Failed to load cards');
      addToast('Failed to load cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCards(); }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setExtracting(true);
    setExtractError('');
    setExtracted(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API}/api/admin/extract`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: rawText }),
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setExtracted(data.card);
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extracted) return;
    setSaving(true);
    setExtractError('');
    try {
      const slug = extracted.slug ||
        extracted.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const payload = {
        ...extracted,
        _id: slug,
        slug,
        source: extracted.source || '',
        last_verified: extracted.last_verified || new Date().toISOString().slice(0, 10),
      };
      const res = await fetch(`${API}/api/admin/cards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSaveSuccess(true);
      setExtracted(null);
      setRawText('');
      loadCards();
      addToast(`"${payload.name}" saved to database & YAML created!`, 'success');
    } catch (err) {
      setExtractError(err.message);
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditCard(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = card => {
    setEditCard(card);
    setForm({
      name: card.name || '',
      issuer: card.issuer || '',
      network: card.network || '',
      slug: card.slug || '',
      fees: { joining: card.fees?.joining ?? 0, annual: card.fees?.annual ?? 0 },
      rewards: { base_rate: card.rewards?.base_rate || '', categories: card.rewards?.categories || [] },
      perks: card.perks || [],
      eligibility: {
        min_age: card.eligibility?.min_age || '',
        min_monthly_income: card.eligibility?.min_monthly_income || '',
      },
      source: card.source || '',
      last_verified: card.last_verified || '',
    });
    setShowForm(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Auto-generate slug from name if not provided
      const slug = form.slug.trim() ||
        form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const payload = { ...form, slug, _id: slug };
      // Default last_verified to today if not set
      if (!payload.last_verified) {
        payload.last_verified = new Date().toISOString().slice(0, 10);
      }

      const url = editCard
        ? `${API}/api/admin/cards/${editCard._id}`
        : `${API}/api/admin/cards`;
      const method = editCard ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      setShowForm(false);
      loadCards();
      addToast(editCard ? `"${form.name}" updated successfully!` : `"${form.name}" added successfully!`, 'success');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    const card = cards.find(c => c._id === id);
    try {
      const res = await fetch(`${API}/api/admin/cards/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 401) { logout(); return; }
      setDeleteId(null);
      loadCards();
      addToast(`"${card?.name || 'Card'}" deleted successfully.`, 'warning');
    } catch {
      setError('Delete failed');
      addToast('Delete failed. Please try again.', 'error');
    }
  };

  const setField = (path, value) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} />
      {/* Navbar */}
      <div className="admin-navbar">
        <span className="admin-brand">Card<span>Perks</span> Admin</span>
        <div className="admin-nav-right">
          <span className="admin-nav-label">{cards.length} cards in DB</span>
          <button className="admin-logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="admin-content">
        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`admin-tab${tab === 'cards' ? ' active' : ''}`} onClick={() => setTab('cards')}>
            📋 Manage Cards
          </button>
          <button className={`admin-tab${tab === 'extract' ? ' active' : ''}`} onClick={() => setTab('extract')}>
            ✨ Extract from Text
          </button>
          {tab === 'cards' && (
            <button className="admin-add-btn" style={{marginLeft:'auto'}} onClick={openAdd}>+ Add New Card</button>
          )}
        </div>

        {error && <div className="admin-error" style={{marginBottom:16}}>{error}</div>}

        {/* ── Manage Cards tab ── */}
        {tab === 'cards' && (
          loading ? (
            <div className="admin-loading">Loading cards...</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Card Name</th>
                    <th>Issuer</th>
                    <th>Network</th>
                    <th>Joining Fee</th>
                    <th>Annual Fee</th>
                    <th>Last Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card, i) => (
                    <tr key={card._id}>
                      <td className="admin-td-num">{i + 1}</td>
                      <td className="admin-td-name">{card.name}</td>
                      <td>{card.issuer}</td>
                      <td>{card.network || '—'}</td>
                      <td>{card.fees?.joining === 0 ? <span className="admin-free">FREE</span> : `₹${card.fees?.joining}`}</td>
                      <td>{card.fees?.annual === 0 ? <span className="admin-free">FREE</span> : `₹${card.fees?.annual}`}</td>
                      <td className="admin-td-date">{card.last_verified || '—'}</td>
                      <td className="admin-td-actions">
                        <button className="admin-edit-btn" onClick={() => openEdit(card)}>Edit</button>
                        <button className="admin-delete-btn" onClick={() => setDeleteId(card._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Extract from Text tab ── */}
        {tab === 'extract' && (
          <div className="extract-panel">
            <div className="extract-instructions">
              <h2>Extract Card from Bank Page Text</h2>
              <p>Go to any bank's credit card page, select all text (Ctrl+A → Ctrl+C), paste it below. Groq AI will extract the card details automatically.</p>
            </div>

            <div className="extract-layout">
              {/* Left: paste area */}
              <div className="extract-left">
                <label className="extract-label">Paste card page text here</label>
                <textarea
                  className="extract-textarea"
                  placeholder="Paste the full text from the bank's credit card page (SBI, HDFC, ICICI etc.)..."
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={18}
                />
                <div className="extract-actions">
                  <span className="extract-char-count">{rawText.length} chars</span>
                  <button
                    className="extract-btn"
                    onClick={handleExtract}
                    disabled={extracting || !rawText.trim()}
                  >
                    {extracting ? (
                      <><span className="extract-spinner" /> Extracting with Groq...</>
                    ) : '✨ Extract Card Data'}
                  </button>
                </div>
                {extractError && <div className="admin-error" style={{marginTop:12}}>{extractError}</div>}
                {saveSuccess && <div className="extract-success">✓ Card saved to database successfully!</div>}
              </div>

              {/* Right: preview */}
              <div className="extract-right">
                <label className="extract-label">Extracted Preview</label>
                {!extracted && !extracting && (
                  <div className="extract-empty">
                    <div className="extract-empty-icon">🤖</div>
                    <p>Paste text on the left and click Extract to see the result here.</p>
                  </div>
                )}
                {extracting && (
                  <div className="extract-empty">
                    <div className="extract-spinner-lg" />
                    <p>Groq is reading the page...</p>
                  </div>
                )}
                {extracted && (
                  <div className="extract-preview">
                    <div className="extract-preview-header">
                      <div>
                        <div className="extract-preview-issuer">{extracted.issuer}</div>
                        <div className="extract-preview-name">{extracted.name}</div>
                        {extracted.network && <span className="extract-preview-network">{extracted.network}</span>}
                      </div>
                    </div>

                    <div className="extract-preview-body">
                      <div className="extract-row">
                        <span className="extract-key">Joining Fee</span>
                        <span className="extract-val">{extracted.fees?.joining === 0 ? 'FREE' : `₹${extracted.fees?.joining}`}</span>
                      </div>
                      <div className="extract-row">
                        <span className="extract-key">Annual Fee</span>
                        <span className="extract-val">{extracted.fees?.annual === 0 ? 'FREE' : `₹${extracted.fees?.annual}`}</span>
                      </div>
                      <div className="extract-row">
                        <span className="extract-key">Base Reward</span>
                        <span className="extract-val">{extracted.rewards?.base_rate}</span>
                      </div>
                      {extracted.rewards?.categories?.length > 0 && (
                        <div className="extract-row extract-row-col">
                          <span className="extract-key">Bonus Categories</span>
                          <ul className="extract-cats">
                            {extracted.rewards.categories.map((c, i) => (
                              <li key={i}><strong>{c.rate}</strong> — {c.merchant}{c.cap ? ` (cap: ${c.cap})` : ''}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {extracted.perks?.length > 0 && (
                        <div className="extract-row extract-row-col">
                          <span className="extract-key">Perks ({extracted.perks.length})</span>
                          <ul className="extract-cats">
                            {extracted.perks.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="extract-row">
                        <span className="extract-key">Slug</span>
                        <span className="extract-val extract-slug">{extracted.slug}</span>
                      </div>
                      <div className="extract-row">
                        <span className="extract-key">Last Verified</span>
                        <span className="extract-val">{extracted.last_verified}</span>
                      </div>
                    </div>

                    <div className="extract-preview-footer">
                      <button className="extract-discard-btn" onClick={() => setExtracted(null)}>Discard</button>
                      <button className="extract-save-btn" onClick={handleSaveExtracted} disabled={saving}>
                        {saving ? 'Saving...' : '✓ Save to Database'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{editCard ? 'Edit Card' : 'Add New Card'}</h2>
              <button className="admin-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Card Name *</label>
                  <input required value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. CASHBACK SBI Card" />
                </div>
                <div className="admin-field">
                  <label>Issuer *</label>
                  <input required value={form.issuer} onChange={e => setField('issuer', e.target.value)} placeholder="e.g. SBI Card" />
                </div>
                <div className="admin-field">
                  <label>Network</label>
                  <select value={form.network} onChange={e => setField('network', e.target.value)}>
                    <option value="">Select</option>
                    <option>Visa</option>
                    <option>Mastercard</option>
                    <option>RuPay</option>
                    <option>Amex</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label>Slug (auto-generated if empty)</label>
                  <input value={form.slug} onChange={e => setField('slug', e.target.value)} placeholder="e.g. cashback-sbi-card" />
                </div>
                <div className="admin-field">
                  <label>Joining Fee (₹)</label>
                  <input type="number" min="0" value={form.fees.joining} onChange={e => setField('fees.joining', Number(e.target.value))} />
                </div>
                <div className="admin-field">
                  <label>Annual Fee (₹)</label>
                  <input type="number" min="0" value={form.fees.annual} onChange={e => setField('fees.annual', Number(e.target.value))} />
                </div>
                <div className="admin-field admin-field-full">
                  <label>Base Reward Rate *</label>
                  <input required value={form.rewards.base_rate} onChange={e => setField('rewards.base_rate', e.target.value)} placeholder="e.g. 1 RP per ₹100 spent" />
                </div>
                <div className="admin-field">
                  <label>Min Age</label>
                  <input type="number" min="18" value={form.eligibility.min_age} onChange={e => setField('eligibility.min_age', Number(e.target.value))} placeholder="21" />
                </div>
                <div className="admin-field">
                  <label>Min Monthly Income (₹)</label>
                  <input type="number" min="0" value={form.eligibility.min_monthly_income} onChange={e => setField('eligibility.min_monthly_income', Number(e.target.value))} placeholder="25000" />
                </div>
                <div className="admin-field">
                  <label>Last Verified</label>
                  <input type="date" value={form.last_verified} onChange={e => setField('last_verified', e.target.value)} />
                </div>
                <div className="admin-field admin-field-full">
                  <label>Source URL *</label>
                  <input required type="url" value={form.source} onChange={e => setField('source', e.target.value)} placeholder="https://sbicard.com/..." />
                </div>
                <div className="admin-field admin-field-full">
                  <label>Perks (one per line)</label>
                  <textarea
                    rows={4}
                    value={form.perks.join('\n')}
                    onChange={e => setField('perks', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Lounge access&#10;Fuel surcharge waiver&#10;Movie discounts"
                  />
                </div>
              </div>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-form-actions">
                <button type="button" className="admin-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="admin-save-btn" disabled={saving}>
                  {saving ? 'Saving...' : editCard ? 'Save Changes' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-confirm-box" onClick={e => e.stopPropagation()}>
            <h3>Delete this card?</h3>
            <p>This action cannot be undone.</p>
            <div className="admin-confirm-actions">
              <button className="admin-cancel-btn" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="admin-delete-confirm-btn" onClick={() => handleDelete(deleteId)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
