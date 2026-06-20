import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', phone: '', email: '', address: '', rc: '', nif: '', siegeSocial: '' };

export default function Customers() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/customers');
    setItems(data.data);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditingId(null); setForm(empty); setModalOpen(true); }
  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '',
      rc: c.rc || '', nif: c.nif || '', siegeSocial: c.siegeSocial || '',
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
      rc: form.rc || null,
      nif: form.nif || null,
      siegeSocial: form.siegeSocial || null,
    };
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
        toast.success('Client modifié');
      } else {
        await api.post('/customers', payload);
        toast.success('Client ajouté');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      await api.delete(`/customers/${id}`);
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
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Carnet d'adresses des clients</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <div className="text-slate-400 text-sm">Aucun client</div>}
        {items.map((c) => (
          <div key={c.id} className="card p-5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{c.name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Receipt size={12} /> {c._count?.sales || 0} ventes
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
              {c.phone && <div className="flex items-center gap-2"><Phone size={13} /> {c.phone}</div>}
              {c.email && <div className="flex items-center gap-2"><Mail size={13} /> {c.email}</div>}
              {c.address && <div className="flex items-center gap-2"><MapPin size={13} /> {c.address}</div>}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier client' : 'Nouveau client'}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="customer-form" type="submit" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSave} className="space-y-3">
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
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">📋 Informations légales (apparaissent sur les factures)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">RC N°</label>
                <input className="input" placeholder="ex: 16/00-1234567" value={form.rc} onChange={(e) => setForm({ ...form, rc: e.target.value })} />
              </div>
              <div>
                <label className="label">NIF</label>
                <input className="input" placeholder="15 chiffres" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Siège social</label>
              <input className="input" placeholder="Adresse du siège..." value={form.siegeSocial} onChange={(e) => setForm({ ...form, siegeSocial: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
