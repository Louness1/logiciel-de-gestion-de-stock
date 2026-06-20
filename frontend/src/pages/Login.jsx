import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Factory, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('messoudigauf@moniagauf.com');
  const [password, setPassword] = useState('hafid2026');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Factory size={28} />
          </div>
          <h1 className="mt-4 text-3xl font-bold">MoniaGauf</h1>
          <p className="mt-1 text-brand-100">Système de gestion de stock industriel</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="vous@moniagauf.com"
              required
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Se connecter'}
          </button>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 text-center">
            <div>🏭 MoniaGauf — Système interne</div>
          </div>
        </form>
      </div>
    </div>
  );
}
