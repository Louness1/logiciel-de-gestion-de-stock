import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Receipt, ShoppingCart, X, UserPlus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext';
import { generateBonLivraisonPDF } from '../lib/livraisonPDF';
import { generateFacturePDF } from '../lib/facturePDF';

const STATUSES = ['PAID', 'PENDING', 'CANCELLED'];

export default function Sales() {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // form state
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  // TVA / Remise / Versement
  const [tvaRate, setTvaRate] = useState(19);
  const [remiseHT, setRemiseHT] = useState(0);
  const [montantVerse, setMontantVerse] = useState(0);

  // new-customer sub-modal
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  async function load() {
    const { data } = await api.get('/sales');
    setSales(data.data);
  }
  useEffect(() => {
    load();
    api.get('/customers').then((r) => setCustomers(r.data.data));
    api.get('/products').then((r) => setProducts(r.data.data));
  }, []);

  function openCreate() {
    setEditingId(null);
    setCustomerId('');
    setStatus('PAID');
    setNotes('');
    setLines([{ productId: '', quantity: 1, unitPrice: 0 }]);
    setTvaRate(19);
    setRemiseHT(0);
    setMontantVerse(0);
    setModalOpen(true);
  }

  async function openEdit(sale) {
    // Recharger la vente complète pour avoir les items à jour
    let s = sale;
    try {
      const { data } = await api.get(`/sales/${sale.id}`);
      s = data.data;
    } catch {}
    setEditingId(s.id);
    setCustomerId(s.customerId ? String(s.customerId) : '');
    setStatus(s.status || 'PAID');
    setNotes(s.notes || '');
    setTvaRate(s.tvaRate ?? 19);
    setRemiseHT(s.remiseHT ?? 0);
    setMontantVerse(s.montantVerse ?? 0);
    setLines(
      (s.items || []).map((it) => ({
        productId: String(it.productId),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    );
    setModalOpen(true);
  }

  function openNewCustomer() {
    setNewCustomer({ name: '', phone: '', email: '', address: '' });
    setNewCustomerOpen(true);
  }

  async function handleSaveNewCustomer(e) {
    e.preventDefault();
    if (!newCustomer.name.trim()) return toast.error('Nom requis');
    setSavingCustomer(true);
    try {
      const payload = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone || null,
        email: newCustomer.email || null,
        address: newCustomer.address || null,
      };
      const { data } = await api.post('/customers', payload);
      // refresh list, auto-select new one for the current sale
      const refreshed = await api.get('/customers');
      setCustomers(refreshed.data.data);
      setCustomerId(String(data.data.id));
      toast.success(`Client ajouté: ${data.data.name}`);
      setNewCustomerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSavingCustomer(false);
    }
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }
  function onPickProduct(idx, productId) {
    const p = products.find((x) => String(x.id) === String(productId));
    // reset quantity to min(current,stock) when picking a product
    const cur = Number(lines[idx]?.quantity) || 1;
    const stock = p ? p.quantity : 0;
    const safeQty = stock > 0 ? Math.min(Math.max(1, cur), stock) : 0;
    updateLine(idx, { productId, unitPrice: p ? p.price : 0, quantity: safeQty });
  }
  function onQuantityChange(idx, raw) {
    const line = lines[idx];
    if (!line.productId) {
      updateLine(idx, { quantity: raw });
      return;
    }
    const p = products.find((x) => String(x.id) === String(line.productId));
    const stock = p ? p.quantity : 0;
    const num = Number(raw);
    if (Number.isNaN(num) || num < 0) {
      updateLine(idx, { quantity: raw });
      return;
    }
    if (num > stock) {
      toast.error(`Stock disponible pour "${p.name}": ${stock} (quantité réduite)`);
      updateLine(idx, { quantity: stock });
      return;
    }
    updateLine(idx, { quantity: num });
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const hasOverStock = lines.some((l) => {
    if (!l.productId) return false;
    const p = products.find((x) => String(x.id) === String(l.productId));
    return p && Number(l.quantity) > p.quantity;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const valid = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (valid.length === 0) return toast.error('Ajoutez au moins une ligne');

    // Final stock check (defense in depth — server also verifies)
    for (const l of valid) {
      const p = products.find((x) => String(x.id) === String(l.productId));
      if (!p) continue;
      if (Number(l.quantity) > p.quantity) {
        return toast.error(`Stock insuffisant pour "${p.name}" (disponible: ${p.quantity})`);
      }
    }

    // Aggregate quantities per product (in case same product is on multiple lines)
    const totals = {};
    for (const l of valid) {
      totals[l.productId] = (totals[l.productId] || 0) + Number(l.quantity);
    }
    for (const pid in totals) {
      const p = products.find((x) => String(x.id) === String(pid));
      if (p && totals[pid] > p.quantity) {
        return toast.error(`Total demandé pour "${p.name}" (${totals[pid]}) dépasse le stock (${p.quantity})`);
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: customerId ? Number(customerId) : null,
        status,
        notes: notes || null,
        tvaRate: Number(tvaRate) || 0,
        remiseHT: Number(remiseHT) || 0,
        montantVerse: Number(montantVerse) || 0,
        items: valid.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      };
      let response;
      if (editingId) {
        response = await api.put(`/sales/${editingId}`, payload);
        toast.success(`Vente modifiée — ${response.data.data.invoiceNo}`);
      } else {
        response = await api.post('/sales', payload);
        toast.success(`Vente créée — ${response.data.data.invoiceNo}`);
      }
      setModalOpen(false);
      // auto-download Bon de Livraison
      generateBonLivraisonPDF(response.data.data);
      // refresh sales + products (stock changed)
      load();
      api.get('/products').then((r) => setProducts(r.data.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sale) {
    if (!confirm(`Annuler la vente ${sale.invoiceNo} ? Le stock sera restauré.`)) return;
    try {
      await api.delete(`/sales/${sale.id}`);
      toast.success('Vente annulée');
      load();
      api.get('/products').then((r) => setProducts(r.data.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDownload(sale, kind = 'livraison') {
    // fetch full sale (with items+product+customer) for accurate PDF
    try {
      const { data } = await api.get(`/sales/${sale.id}`);
      if (kind === 'facture') generateFacturePDF(data.data);
      else generateBonLivraisonPDF(data.data);
    } catch {
      if (kind === 'facture') generateFacturePDF(sale);
      else generateBonLivraisonPDF(sale);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Ventes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Historique des ventes et bons d'achat</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <ShoppingCart size={16} /> Nouvelle vente
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">N° Facture</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucune vente enregistrée</td></tr>
              )}
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3 font-mono font-semibold">{s.invoiceNo}</td>
                  <td className="px-4 py-3">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{s.customer?.name || <span className="text-slate-400">— passage —</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{s.items.length}</td>
                  <td className="px-4 py-3 font-semibold">{(s.total || 0).toFixed(2)} DA</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : s.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => handleDownload(s, 'livraison')}
                      className="inline-flex items-center gap-1 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 px-2 py-1 text-xs font-medium"
                      title="Bon de Livraison"
                    >
                      <FileText size={12} /> BL
                    </button>
                    <button
                      onClick={() => handleDownload(s, 'facture')}
                      className="inline-flex items-center gap-1 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 px-2 py-1 text-xs font-medium"
                      title="Facture"
                    >
                      <Receipt size={12} /> Facture
                    </button>
                    {canCreate && (
                      <button onClick={() => openEdit(s)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Modifier">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(s)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30" title="Annuler vente">
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
        title={editingId ? 'Modifier la vente' : 'Nouvelle vente'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button form="sale-form" type="submit" disabled={submitting || hasOverStock} className="btn-primary">
              {submitting ? 'Enregistrement...' : hasOverStock ? 'Stock insuffisant' : (editingId ? 'Modifier et générer PDF' : 'Valider et générer PDF')}
            </button>
          </>
        }
      >
        <form id="sale-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Client</label>
                <button
                  type="button"
                  onClick={openNewCustomer}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus size={12} /> Nouveau client
                </button>
              </div>
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— Client de passage —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
              </select>
              {customerId && (() => {
                const c = customers.find((x) => String(x.id) === String(customerId));
                if (!c) return null;
                return (
                  <div className="mt-2 rounded-md bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    {c.phone && <div>📞 {c.phone}</div>}
                    {c.email && <div>📧 {c.email}</div>}
                    {c.address && <div>📍 {c.address}</div>}
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
              <label className="label !mb-0">Articles</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const p = products.find((x) => String(x.id) === String(line.productId));
                const stock = p ? p.quantity : null;
                const subtotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                const overStock = p && Number(line.quantity) > p.quantity;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <select
                        className="input"
                        value={line.productId}
                        onChange={(e) => onPickProduct(idx, e.target.value)}
                        required
                      >
                        <option value="">— Produit —</option>
                        {products.map((pr) => (
                          <option key={pr.id} value={pr.id} disabled={pr.quantity <= 0}>
                            {pr.name} (stock: {pr.quantity} cartons){pr.quantity <= 0 ? ' — épuisé' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number" min="1" max={stock || undefined} step="1"
                        className={`input ${overStock ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        placeholder="Cartons"
                        value={line.quantity}
                        onChange={(e) => onQuantityChange(idx, e.target.value)}
                        onBlur={(e) => onQuantityChange(idx, e.target.value)}
                        disabled={!line.productId}
                      />
                      {p && (
                        <div className={`text-[10px] mt-0.5 ${overStock ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                          stock: {p.quantity} cartons
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number" step="0.01" min="0"
                        className="input"
                        placeholder="Prix"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 text-sm font-semibold py-2 text-right">
                      {subtotal.toFixed(2)} DA
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeLine(idx)} className="rounded p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30" disabled={lines.length === 1}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TVA / Remise / Versement */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">💰 Calculs comptables</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">TVA (%)</label>
                <input type="number" min="0" max="100" step="0.5" className="input" value={tvaRate} onChange={(e) => setTvaRate(e.target.value)} />
              </div>
              <div>
                <label className="label">Remise HT (DA)</label>
                <input type="number" min="0" step="0.01" className="input" value={remiseHT} onChange={(e) => setRemiseHT(e.target.value)} />
              </div>
              <div>
                <label className="label">Montant versé (DA)</label>
                <input type="number" min="0" step="0.01" className="input" value={montantVerse} onChange={(e) => setMontantVerse(e.target.value)} />
              </div>
            </div>

            {/* Récapitulatif des totaux */}
            {(() => {
              const sumHT = total;
              const r = Number(remiseHT) || 0;
              const tva = Number(tvaRate) || 0;
              const vers = Number(montantVerse) || 0;
              const totalHT = Math.max(0, sumHT - r);
              const totalTVA = totalHT * (tva / 100);
              const totalTTC = totalHT + totalTVA;
              const reste = totalTTC - vers;
              return (
                <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Sous-total HT :</span><span className="font-mono">{sumHT.toFixed(2)} DA</span></div>
                  {r > 0 && <div className="flex justify-between text-red-600"><span>Remise :</span><span className="font-mono">- {r.toFixed(2)} DA</span></div>}
                  <div className="flex justify-between font-semibold"><span>Total HT :</span><span className="font-mono">{totalHT.toFixed(2)} DA</span></div>
                  {tva > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>TVA ({tva}%) :</span><span className="font-mono">{totalTVA.toFixed(2)} DA</span></div>}
                  <div className="flex justify-between text-lg font-bold text-brand-600 border-t border-slate-200 dark:border-slate-700 pt-1"><span>Total TTC :</span><span className="font-mono">{totalTTC.toFixed(2)} DA</span></div>
                  {vers > 0 && (
                    <>
                      <div className="flex justify-between text-slate-500"><span>Versé :</span><span className="font-mono">{vers.toFixed(2)} DA</span></div>
                      <div className={`flex justify-between font-bold ${reste > 0 ? 'text-red-600' : 'text-green-600'}`}><span>Reste à payer :</span><span className="font-mono">{reste.toFixed(2)} DA</span></div>
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
        </form>
      </Modal>

      {/* Sub-modal: nouveau client (depuis la fenêtre vente) */}
      <Modal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        title="Nouveau client"
        footer={
          <>
            <button type="button" onClick={() => setNewCustomerOpen(false)} className="btn-secondary">Annuler</button>
            <button form="new-customer-form" type="submit" disabled={savingCustomer} className="btn-primary">
              {savingCustomer ? 'Enregistrement...' : 'Enregistrer et sélectionner'}
            </button>
          </>
        }
      >
        <form id="new-customer-form" onSubmit={handleSaveNewCustomer} className="space-y-3">
          <div className="rounded-md bg-brand-50 dark:bg-brand-900/20 p-2.5 text-xs text-brand-700 dark:text-brand-300">
            ℹ️ Ces informations seront enregistrées dans votre carnet de clients et apparaîtront sur le bon d'achat (PDF).
          </div>
          <div>
            <label className="label">Nom complet / Raison sociale *</label>
            <input
              className="input" required autoFocus
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="ex: Société Distribution ABC"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input
                className="input"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+213 ..."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input" type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="contact@..."
              />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input
              className="input"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              placeholder="Wilaya, ville, rue..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
