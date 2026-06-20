import { useEffect, useState } from 'react';
import { Wheat, Package, Truck, Users, AlertTriangle, CalendarClock, TrendingUp, Boxes } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../lib/api';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function StatCard({ icon: Icon, label, value, accent = 'brand', sub }) {
  const colors = {
    brand:  'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-3xl font-bold">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        <div className={`rounded-xl p-2.5 ${colors[accent]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/recent-activity')])
      .then(([s, a]) => { setStats(s.data); setActivity(a.data.data); })
      .catch(() => {});
  }, []);

  if (!stats) return <div className="text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-slate-500 dark:text-slate-400">Vue d'ensemble de votre stock et production</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wheat}   label="Matières premières" value={stats.counts.materials} accent="brand"  sub={`${stats.quantities.totalMaterialQuantity} unités totales`} />
        <StatCard icon={Package} label="Produits finis"     value={stats.counts.products}  accent="green"  sub={`${stats.quantities.totalProductQuantity} unités en stock`} />
        <StatCard icon={Truck}   label="Fournisseurs"       value={stats.counts.suppliers} accent="purple" />
        <StatCard icon={Users}   label="Utilisateurs"       value={stats.counts.users}     accent="amber"  />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={AlertTriangle}  label="Stock faible (matières)"  value={stats.alerts.lowStockMaterials} accent="red" />
        <StatCard icon={Boxes}          label="Stock faible (produits)"  value={stats.alerts.lowStockProducts}  accent="red" />
        <StatCard icon={CalendarClock}  label="Expirent < 30 jours"      value={stats.alerts.expiringSoon}      accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-500" />
            Matières premières par catégorie
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.charts.materialsByCategory}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package size={18} className="text-green-500" />
            Produits finis par catégorie
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.charts.productsByCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                {stats.charts.productsByCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Activités récentes</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune activité enregistrée</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{a.user?.fullName || 'Système'}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="text-slate-600 dark:text-slate-300">{a.action}</span>
                  {a.entity && <span className="text-slate-400"> ({a.entity})</span>}
                </div>
                <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
