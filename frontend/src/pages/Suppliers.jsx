import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Suppliers() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/suppliers');
    setItems(data.data);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditingId(null); setForm(empty); setModalOpen(true); }
  function openEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name || '', phone: s.phone || '', email: s.email || '',
      address: s.address || '', notes: s.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
        toast.success('Fournisseur modifié');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Fournisseur ajouté');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
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
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Carnet d'adresses des fournisseurs</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="text-slate-400 text-sm">Aucun fournisseur</div>
        )}
        {items.map((s) => (
          <div key={s.id} className="card p-5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{s.name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Package size={12} /> {s._count?.materials || 0} matières
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
              {s.phone && <div className="flex items-center gap-2"><Phone size={13} /> {s.phone}</div>}
              {s.email && <div className="flex items-center gap-2"><Mail size={13} /> {s.email}</div>}
              {s.address && <div className="flex items-center gap-2"><MapPin size={13} /> {s.address}</div>}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier fournisseur' : 'Nouveau fournisseur'}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="supplier-form" type="submit" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email <span className="text-slate-400 font-normal">(optionnel)</span></label>
              <input className="input" type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
