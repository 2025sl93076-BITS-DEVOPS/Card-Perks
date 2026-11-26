const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchCards() {
  const res = await fetch(`${API_BASE}/api/cards`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function fetchCard(id) {
  const res = await fetch(`${API_BASE}/api/cards/${id}`);
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
}
