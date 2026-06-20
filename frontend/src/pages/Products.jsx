import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['gaufrette_chocolat', 'gaufrette_vanille', 'gaufrette_citron', 'gaufrette_fraise'];

const empty = { name: '', category: 'gaufrette_chocolat', sku: '', price: 0, quantity: 0, minQuantity: 0, description: '' };

export default function Products() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    const { data } = await api.get('/products', { params });
    setItems(data.data);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, category]);

  function openCreate() { setEditingId(null); setForm(empty); setModalOpen(true); }
  function openEdit(p) {
    setEditingId(p.id);
    setForm({ ...p, sku: p.sku || '', description: p.description || '' });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
      minQuantity: Number(form.minQuantity),
      sku: form.sku || null,
      description: form.description || null,
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success('Produit modifié');
      } else {
        await api.post('/products', payload);
        toast.success('Produit ajouté');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Supprimé');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Produits finis</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gérer le catalogue des produits</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-9" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Quantité</th>
                <th className="px-4 py-3 font-semibold">Min</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-slate-400">Aucun produit</td></tr>
              )}
              {items.map((p) => {
                const low = p.quantity <= p.minQuantity;
                return (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3"><span className="badge bg-slate-100 dark:bg-slate-800">{p.category}</span></td>
                    <td className="px-4 py-3">{p.price} DA</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                        {low && <AlertTriangle size={14} />}
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.minQuantity}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => openEdit(p)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30">
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
        title={editingId ? 'Modifier produit' : 'Nouveau produit'}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="product-form" type="submit" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SKU (optionnel)</label>
              <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Prix (DA)</label>
              <input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="label">Quantité</label>
              <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Min (alerte)</label>
              <input className="input" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
