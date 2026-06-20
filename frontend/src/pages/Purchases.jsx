import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Receipt, Truck, X, PackagePlus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';
import { generatePurchaseBonPDF } from '../lib/purchaseInvoice';

const STATUSES = ['PAID', 'PENDING', 'CANCELLED'];

export default function Purchases() {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // form state
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [updatePrice, setUpdatePrice] = useState(true);
  const [tvaRate, setTvaRate] = useState(0);
  const [lines, setLines] = useState([{ materialId: '', quantity: '', unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // sub-modal: nouveau fournisseur
  const [newSupOpen, setNewSupOpen] = useState(false);
  const [newSup, setNewSup] = useState({ name: '', phone: '', email: '', address: '' });
  const [savingSup, setSavingSup] = useState(false);

  async function load() {
    const { data } = await api.get('/purchases');
    setPurchases(data.data);
  }
  function reloadMaterials() {
    api.get('/materials').then((r) => setMaterials(r.data.data));
  }
  useEffect(() => {
    load();
    api.get('/suppliers').then((r) => setSuppliers(r.data.data));
    reloadMaterials();
  }, []);

  function openCreate() {
    setEditingId(null);
    setSupplierId('');
    setStatus('PAID');
    setNotes('');
    setUpdatePrice(true);
    setTvaRate(0);
    setLines([{ materialId: '', quantity: '', unitPrice: 0 }]);
    setModalOpen(true);
  }

  async function openEdit(purchase) {
    let p = purchase;
    try {
      const { data } = await api.get(`/purchases/${purchase.id}`);
      p = data.data;
    } catch {}
    setEditingId(p.id);
    setSupplierId(p.supplierId ? String(p.supplierId) : '');
    setStatus(p.status || 'PAID');
    setNotes(p.notes || '');
    setUpdatePrice(false); // par défaut on ne re-update pas les prix lors d'une modif
    setTvaRate(p.tvaRate ?? 0);
    setLines(
      (p.items || []).map((it) => ({
        materialId: String(it.materialId),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    );
    setModalOpen(true);
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { materialId: '', quantity: '', unitPrice: 0 }]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }
  function onPickMaterial(idx, materialId) {
    const m = materials.find((x) => String(x.id) === String(materialId));
    updateLine(idx, { materialId, unitPrice: m ? m.unitPrice : 0 });
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const valid = lines.filter((l) => l.materialId && Number(l.quantity) > 0);
    if (valid.length === 0) return toast.error('Ajoutez au moins une matière');

    setSubmitting(true);
    try {
      const payload = {
        supplierId: supplierId ? Number(supplierId) : null,
        status,
        notes: notes || null,
        updatePrice,
        tvaRate: Number(tvaRate) || 0,
        items: valid.map((l) => ({
          materialId: Number(l.materialId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      };
      let response;
      if (editingId) {
        response = await api.put(`/purchases/${editingId}`, payload);
        toast.success(`Bon modifié — ${response.data.data.invoiceNo}`);
      } else {
        response = await api.post('/purchases', payload);
        toast.success(`Bon créé — ${response.data.data.invoiceNo}`);
      }
      setModalOpen(false);
      generatePurchaseBonPDF(response.data.data, { withTVA: false });
      load();
      reloadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Annuler le bon ${p.invoiceNo} ? Les quantités seront retirées du stock.`)) return;
    try {
      await api.delete(`/purchases/${p.id}`);
      toast.success('Bon annulé');
      load();
      reloadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDownload(p, withTVA = false) {
    try {
      const { data } = await api.get(`/purchases/${p.id}`);
      generatePurchaseBonPDF(data.data, { withTVA });
    } catch {
      generatePurchaseBonPDF(p, { withTVA });
    }
  }

  function openNewSupplier() {
    setNewSup({ name: '', phone: '', email: '', address: '' });
    setNewSupOpen(true);
  }
  async function handleSaveNewSupplier(e) {
    e.preventDefault();
    if (!newSup.name.trim()) return toast.error('Nom requis');
    setSavingSup(true);
    try {
      const payload = {
        name: newSup.name.trim(),
        phone: newSup.phone || null,
        email: newSup.email || null,
        address: newSup.address || null,
      };
      const { data } = await api.post('/suppliers', payload);
      const refreshed = await api.get('/suppliers');
      setSuppliers(refreshed.data.data);
      setSupplierId(String(data.data.id));
      toast.success(`Fournisseur ajouté: ${data.data.name}`);
      setNewSupOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSavingSup(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Achats</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Bons de réception des matières premières — augmente automatiquement le stock
          </p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <PackagePlus size={16} /> Nouveau bon d'achat
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">N° Bon</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Matières</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun achat enregistré</td></tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3 font-mono font-semibold">{p.invoiceNo}</td>
                  <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{p.supplier?.name || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{p.items.length}</td>
                  <td className="px-4 py-3 font-semibold">{p.total.toFixed(2)} DA</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      p.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      p.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => handleDownload(p, false)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-2 py-1 text-xs font-medium"
                      title="Bon sans TVA"
                    >
                      <FileText size={12} /> Sans TVA
                    </button>
                    <button
                      onClick={() => handleDownload(p, true)}
                      disabled={!p.tvaRate || p.tvaRate <= 0}
                      className="inline-flex items-center gap-1 rounded-md bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 px-2 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      title={p.tvaRate > 0 ? `Avec TVA ${p.tvaRate}%` : 'TVA non saisie pour ce bon'}
                    >
                      <Receipt size={12} /> TVA {p.tvaRate > 0 ? `${p.tvaRate}%` : ''}
                    </button>
                    {canCreate && (
                      <button onClick={() => openEdit(p)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Modifier">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(p)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30" title="Annuler bon">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifier bon d'achat" : "Nouveau bon d'achat (matières premières)"}
        size="xl"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="purchase-form" type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Enregistrement...' : (editingId ? 'Modifier et générer PDF' : 'Valider et générer PDF')}
            </button>
          </>
        }
      >
        <form id="purchase-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Fournisseur</label>
                <button type="button" onClick={openNewSupplier} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  <Truck size={12} /> Nouveau fournisseur
                </button>
              </div>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Fournisseur de passage —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.phone ? ` — ${s.phone}` : ''}</option>)}
              </select>
              {supplierId && (() => {
                const s = suppliers.find((x) => String(x.id) === String(supplierId));
                if (!s) return null;
                return (
                  <div className="mt-2 rounded-md bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    {s.phone && <div>📞 {s.phone}</div>}
                    {s.email && <div>📧 {s.email}</div>}
                    {s.address && <div>📍 {s.address}</div>}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Matières premières achetées</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const m = materials.find((x) => String(x.id) === String(line.materialId));
                const subtotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <select className="input" value={line.materialId} onChange={(e) => onPickMaterial(idx, e.target.value)} required>
                        <option value="">— Matière —</option>
                        {materials.map((mt) => (
                          <option key={mt.id} value={mt.id}>
                            {mt.name} (stock: {mt.quantity} {mt.unit})
                          </option>
                        ))}
                      </select>
                      {m && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          unité: <strong>{m.unit}</strong> · prix actuel: {m.unitPrice} DA
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number" step="0.01" min="0"
                        className="input" placeholder={`Qté ${m?.unit || ''}`}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number" step="0.01" min="0"
                        className="input" placeholder="Prix U."
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 text-sm font-semibold py-2 text-right">
                      {subtotal.toFixed(2)} DA
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="label">TVA (%) — pour version "avec TVA" du bon</label>
                <input type="number" min="0" max="100" step="0.5" className="input" value={tvaRate} onChange={(e) => setTvaRate(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pb-3">
                <input type="checkbox" checked={updatePrice} onChange={(e) => setUpdatePrice(e.target.checked)} />
                Mettre à jour le prix unitaire des matières
              </label>
            </div>

            {(() => {
              const tva = Number(tvaRate) || 0;
              const totalTVA = total * (tva / 100);
              const totalTTC = total + totalTVA;
              return (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1">
                  <div className="flex justify-between font-semibold"><span>Total HT :</span><span className="font-mono">{total.toFixed(2)} DA</span></div>
                  {tva > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>TVA ({tva}%) :</span><span className="font-mono">{totalTVA.toFixed(2)} DA</span></div>
                      <div className="flex justify-between text-lg font-bold text-green-600 border-t border-slate-200 dark:border-slate-700 pt-1"><span>Total TTC :</span><span className="font-mono">{totalTTC.toFixed(2)} DA</span></div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2.5 text-xs text-green-700 dark:text-green-300">
            ✅ À la validation, les quantités seront <strong>ajoutées</strong> automatiquement au stock des matières premières.
          </div>
        </form>
      </Modal>

      {/* Sub-modal: nouveau fournisseur */}
      <Modal
        open={newSupOpen}
        onClose={() => setNewSupOpen(false)}
        title="Nouveau fournisseur"
        footer={
          <>
            <button type="button" onClick={() => setNewSupOpen(false)} className="btn-secondary">Annuler</button>
            <button form="new-sup-form" type="submit" disabled={savingSup} className="btn-primary">
              {savingSup ? 'Enregistrement...' : 'Enregistrer et sélectionner'}
            </button>
          </>
        }
      >
        <form id="new-sup-form" onSubmit={handleSaveNewSupplier} className="space-y-3">
          <div>
            <label className="label">Nom / Raison sociale *</label>
            <input className="input" required autoFocus value={newSup.name} onChange={(e) => setNewSup({ ...newSup, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={newSup.phone} onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={newSup.email} onChange={(e) => setNewSup({ ...newSup, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={newSup.address} onChange={(e) => setNewSup({ ...newSup, address: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
