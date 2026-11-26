import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CardList from './pages/CardList';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('admin_token');
  return token ? children : <Navigate to="/admin" replace />;
}

function AdminGuard({ children }) {
  const token = localStorage.getItem('admin_token');
  return token ? <Navigate to="/admin/cards" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes — no navbar/footer */}
        <Route path="/admin" element={<AdminGuard><AdminLogin /></AdminGuard>} />
        <Route path="/admin/cards" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

        {/* Public routes */}
        <Route path="/*" element={
          <>
            <header className="app-header">
              <a href="/" className="app-title">Card<span>Perks</span></a>
              <nav className="app-nav">
                <p className="app-subtitle">Indian credit card benefits, in one place</p>
                <a
                  href="https://github.com/2025sl93052-alt/Card-Perks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-github"
                  title="View on GitHub"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  GitHub
                </a>
              </nav>
            </header>
            <Routes>
              <Route path="/*" element={<CardList />} />
            </Routes>
            <footer className="app-footer">
              <div className="app-footer-inner">
                <div className="footer-brand">
                  <span className="footer-logo">Card<span>Perks</span></span>
                  <p>Open-source Indian credit card benefits catalog.</p>
                </div>
                <div className="footer-links">
                  <a href="https://github.com/2025sl93052-alt/Card-Perks" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://sbicard.com" target="_blank" rel="noopener noreferrer">SBI Cards</a>
                  <a href="https://hdfcbank.com" target="_blank" rel="noopener noreferrer">HDFC Bank</a>
                  <a href="https://icicibank.com" target="_blank" rel="noopener noreferrer">ICICI Bank</a>
                </div>
                <div className="footer-disclaimer">
                  <p>© 2026 CardPerks · Data sourced from official bank websites.</p>
                  <p>Not financial advice. Verify details on the bank's official page before applying.</p>
                </div>
              </div>
            </footer>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}
