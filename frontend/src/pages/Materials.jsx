import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['pate', 'creme', 'emballage', 'autre'];
const UNITS = ['kg', 'L', 'unité'];

const CATEGORY_LABELS = {
  pate: 'Pâte',
  creme: 'Crème',
  emballage: 'Emballage',
  autre: 'Autre',
};

const empty = {
  name: '', category: 'pate', unit: 'kg',
  quantity: 0, minQuantity: 0, unitPrice: 0,
  expiryDate: '', supplierId: '',
};

export default function Materials() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (lowStockOnly) params.lowStock = 'true';
    const { data } = await api.get('/materials', { params });
    setItems(data.data);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, category, lowStockOnly]);
  useEffect(() => { api.get('/suppliers').then((r) => setSuppliers(r.data.data)); }, []);

  function openCreate() { setEditingId(null); setForm(empty); setModalOpen(true); }
  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      ...m,
      expiryDate: m.expiryDate ? m.expiryDate.slice(0, 10) : '',
      supplierId: m.supplierId || '',
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      minQuantity: Number(form.minQuantity),
      unitPrice: Number(form.unitPrice),
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
    };
    try {
      if (editingId) {
        await api.put(`/materials/${editingId}`, payload);
        toast.success('Matière modifiée');
      } else {
        await api.post('/materials', payload);
        toast.success('Matière ajoutée');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette matière ?')) return;
    try {
      await api.delete(`/materials/${id}`);
      toast.success('Supprimée');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Matières premières</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gérer les ingrédients et matériaux</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="input pl-9"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Stock faible uniquement
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Quantité</th>
                <th className="px-4 py-3 font-semibold">Min</th>
                <th className="px-4 py-3 font-semibold">Prix unitaire</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Expiration</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={canEdit ? 8 : 7} className="px-4 py-8 text-center text-slate-400">Aucune matière</td></tr>
              )}
              {items.map((m) => {
                const low = m.quantity <= m.minQuantity;
                return (
                  <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3"><span className="badge bg-slate-100 dark:bg-slate-800">{CATEGORY_LABELS[m.category] || m.category}</span></td>
                    <td className="px-4 py-3">
                      <span className={low ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                        {low && <AlertTriangle size={14} />}
                        {m.quantity} {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.minQuantity} {m.unit}</td>
                    <td className="px-4 py-3">{m.unitPrice} DA</td>
                    <td className="px-4 py-3">{m.supplier?.name || '—'}</td>
                    <td className="px-4 py-3">{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => openEdit(m)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" title="Modifier">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30" title="Supprimer">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier matière' : 'Nouvelle matière'}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="material-form" type="submit" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="material-form" onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unité</label>
              <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Quantité</label>
              <input className="input" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Min (alerte)</label>
              <input className="input" type="number" step="0.01" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Prix unitaire</label>
              <input className="input" type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fournisseur</label>
              <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">— Aucun —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date d'expiration</label>
              <input className="input" type="date" value={form.expiryDate || ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
