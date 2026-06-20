import { useEffect, useState } from 'react';
import { Factory, Loader2, CheckCircle2, AlertCircle, Wheat, XCircle, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';

function formatQty(qty, unit) {
  if (unit === 'kg' && qty < 1) return `${(qty * 1000).toFixed(2)} g`;
  if (unit === 'L' && qty < 1) return `${(qty * 1000).toFixed(2)} mL`;
  if (unit === 'unité') {
    // Round to integer for display when total is non-trivial; otherwise show fraction
    if (qty >= 1) return `${Math.ceil(qty)} ${unit}${Math.ceil(qty) > 1 ? 's' : ''}`;
    return `${qty.toFixed(4)} ${unit}`;
  }
  return `${qty.toFixed(3)} ${unit}`;
}

function StatusBadge({ status }) {
  const map = {
    PENDING: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock, label: 'En attente' },
    COMPLETED: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2, label: 'Complétée' },
    NOT_COMPLETED: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle, label: 'Non complétée' },
  };
  const m = map[status] || map.PENDING;
  const Icon = m.icon;
  return (
    <span className={`badge gap-1 ${m.cls}`}>
      <Icon size={12} /> {m.label}
    </span>
  );
}

export default function Production() {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role);
  const canDelete = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [productions, setProductions] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data } = await api.get('/production');
    setProductions(data.data);
  }
  function reloadProducts() {
    api.get('/products').then((r) => setProducts(r.data.data));
  }

  useEffect(() => { load(); reloadProducts(); }, []);

  function openCreate() {
    setProductId('');
    setQuantity(100);
    setNotes('');
    setPreview(null);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!productId || !quantity || quantity <= 0) { setPreview(null); return; }
    setLoadingPreview(true);
    api.get(`/production/preview/${productId}/${quantity}`)
      .then((r) => setPreview(r.data))
      .catch((e) => {
        setPreview(null);
        toast.error(e.response?.data?.error || 'Erreur preview');
      })
      .finally(() => setLoadingPreview(false));
  }, [productId, quantity]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/production', {
        productId: Number(productId),
        quantity: Number(quantity),
        notes: notes || null,
      });
      toast.success(`Ordre créé (en attente) — ${data.data.product.name} × ${data.data.quantity}`);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(p) {
    if (!confirm(`Compléter l'ordre ? Cela va consommer les matières premières et ajouter ${p.quantity} × ${p.product.name} au stock.`)) return;
    setBusyId(p.id);
    try {
      await api.patch(`/production/${p.id}/complete`);
      toast.success('✅ Ordre complété, stock mis à jour');
      load();
      reloadProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(p) {
    if (!confirm(`Marquer l'ordre comme "Non complétée" ? Aucun stock ne sera affecté.`)) return;
    setBusyId(p.id);
    try {
      await api.patch(`/production/${p.id}/cancel`);
      toast.success('Ordre marqué non-complétée');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Supprimer définitivement cet ordre ?`)) return;
    setBusyId(p.id);
    try {
      await api.delete(`/production/${p.id}`);
      toast.success('Supprimé');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Ordres de fabrication — le stock est consommé uniquement à la complétion
          </p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Factory size={16} /> Nouvel ordre
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Cartons</th>
                <th className="px-4 py-3 font-semibold">Opérateur</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun ordre de production</td></tr>
              )}
              {productions.map((p) => {
                const isPending = p.status === 'PENDING';
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(p.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 font-medium">{p.product.name}</td>
                    <td className="px-4 py-3 font-semibold">{p.quantity}</td>
                    <td className="px-4 py-3 text-slate-500">{p.user?.fullName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleComplete(p)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 px-2.5 py-1.5 text-xs text-white font-medium"
                            title="Compléter (consomme les matières)"
                          >
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            Complétée
                          </button>
                          <button
                            onClick={() => handleCancel(p)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-2.5 py-1.5 text-xs text-white font-medium"
                            title="Marquer non complétée (pas de stock)"
                          >
                            <XCircle size={13} />
                            Non complétée
                          </button>
                        </div>
                      ) : canDelete && p.status === 'NOT_COMPLETED' ? (
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={busy}
                          className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
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
        title="Nouvel ordre de fabrication"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="production-form" type="submit" disabled={submitting || !productId} className="btn-primary">
              {submitting ? 'Création...' : 'Créer l\'ordre (en attente)'}
            </button>
          </>
        }
      >
        <form id="production-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
            ℹ️ L'ordre sera créé en statut <strong>"En attente"</strong>. Le stock ne sera modifié que lorsque vous cliquerez sur <strong className="text-green-600">Complétée</strong>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Produit à fabriquer</label>
              <select className="input" required value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cartons à produire</label>
              <input
                type="number" min="1"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {productId && (
            <div className={`rounded-lg border p-3 ${
              loadingPreview
                ? 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                : preview?.allSufficient
                ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
            }`}>
              <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                {loadingPreview ? (
                  <><Loader2 size={14} className="animate-spin" /> Calcul des besoins...</>
                ) : preview?.allSufficient ? (
                  <><CheckCircle2 size={14} className="text-green-600" /> Stock actuel suffisant pour cette production</>
                ) : (
                  <><AlertCircle size={14} className="text-amber-600" /> Stock actuel insuffisant — vous pouvez créer l'ordre mais devrez réapprovisionner avant de le compléter</>
                )}
              </div>

              {preview && (
                <div className="space-y-1 text-xs">
                  {preview.requirements.map((r) => (
                    <div key={r.materialId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wheat size={12} className="text-slate-400" />
                        <span>{r.materialName}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-500">
                          besoin: <strong className="text-slate-800 dark:text-slate-200">{formatQty(r.totalNeeded, r.unit)}</strong>
                        </span>
                        <span className={r.sufficient ? 'text-green-600' : 'text-red-600 font-bold'}>
                          stock: {r.currentStock} {r.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
