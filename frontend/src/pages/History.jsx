import { useEffect, useMemo, useState } from 'react';
import { Search, FileDown, Receipt, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { api } from '../lib/api';
import { generateBonLivraisonPDF } from '../lib/livraisonPDF';

function StatCard({ icon: Icon, label, value, accent = 'brand', sub }) {
  const colors = {
    brand:  'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        <div className={`rounded-xl p-2.5 ${colors[accent]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/sales').then((r) => setSales(r.data.data));
    api.get('/products').then((r) => setProducts(r.data.data));
    api.get('/customers').then((r) => setCustomers(r.data.data));
  }, []);

  // Flatten sales -> items list
  const allItems = useMemo(() => {
    const items = [];
    for (const sale of sales) {
      for (const it of sale.items) {
        items.push({
          id: `${sale.id}-${it.id}`,
          date: sale.createdAt,
          invoiceNo: sale.invoiceNo,
          saleId: sale.id,
          status: sale.status,
          customer: sale.customer,
          customerId: sale.customerId,
          product: it.product,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
          sale,
        });
      }
    }
    return items;
  }, [sales]);

  // Apply filters
  const filtered = useMemo(() => {
    return allItems.filter((it) => {
      if (statusFilter && it.status !== statusFilter) return false;
      if (productId && String(it.productId) !== String(productId)) return false;
      if (customerId && String(it.customerId) !== String(customerId)) return false;
      if (from) {
        const d = new Date(it.date);
        if (d < new Date(from + 'T00:00:00')) return false;
      }
      if (to) {
        const d = new Date(it.date);
        if (d > new Date(to + 'T23:59:59')) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          it.invoiceNo, it.product?.name, it.product?.sku, it.customer?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, statusFilter, productId, customerId, from, to, search]);

  // Summary stats (only for non-cancelled by default)
  const stats = useMemo(() => {
    const active = filtered.filter((it) => it.status !== 'CANCELLED');
    const totalCA = active.reduce((s, it) => s + it.subtotal, 0);
    const totalQty = active.reduce((s, it) => s + it.quantity, 0);
    const uniqueSales = new Set(active.map((it) => it.saleId)).size;

    // Top products by qty
    const byProduct = {};
    for (const it of active) {
      if (!byProduct[it.productId]) {
        byProduct[it.productId] = { name: it.product?.name || '?', qty: 0, ca: 0 };
      }
      byProduct[it.productId].qty += it.quantity;
      byProduct[it.productId].ca += it.subtotal;
    }
    const topProducts = Object.values(byProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { totalCA, totalQty, uniqueSales, topProducts };
  }, [filtered]);

  function reset() {
    setFrom(''); setTo(''); setProductId(''); setCustomerId(''); setSearch(''); setStatusFilter('');
  }

  async function downloadInvoice(saleId) {
    try {
      const { data } = await api.get(`/sales/${saleId}`);
      generateBonLivraisonPDF(data.data);
    } catch {}
  }

  function exportCSV() {
    const rows = [
      ['Date', 'N° Facture', 'Statut', 'Client', 'Produit', 'SKU', 'Quantité', 'Prix U. (DA)', 'Sous-total (DA)'],
      ...filtered.map((it) => [
        new Date(it.date).toLocaleString('fr-FR'),
        it.invoiceNo,
        it.status,
        it.customer?.name || 'Passage',
        it.product?.name || '',
        it.product?.sku || '',
        it.quantity,
        it.unitPrice.toFixed(2),
        it.subtotal.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_ventes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Historique des ventes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Liste détaillée de tous les produits vendus
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary" disabled={filtered.length === 0}>
          <FileDown size={16} /> Exporter CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp}  label="Chiffre d'affaires" value={`${stats.totalCA.toFixed(2)} DA`} accent="green" sub="ventes non annulées" />
        <StatCard icon={Package}     label="Quantité vendue"    value={stats.totalQty} accent="brand" sub="produits expédiés" />
        <StatCard icon={ShoppingCart} label="Nombre de ventes"   value={stats.uniqueSales} accent="purple" sub="factures distinctes" />
      </div>

      {/* Top products */}
      {stats.topProducts.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" />
            Top produits vendus (selon les filtres)
          </h3>
          <div className="space-y-2">
            {stats.topProducts.map((p, i) => {
              const max = stats.topProducts[0].qty || 1;
              const pct = (p.qty / max) * 100;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-slate-500">{p.qty} unités · {p.ca.toFixed(2)} DA</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label className="label text-xs">Recherche</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="N° facture, produit, client..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label text-xs">Du</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Au</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Produit</label>
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Tous</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Client</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Tous</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-6 flex items-end gap-2">
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button onClick={reset} className="btn-secondary text-xs">Réinitialiser</button>
          <span className="ml-auto text-xs text-slate-500 self-center">
            {filtered.length} ligne{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Facture</th>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold text-right">Quantité</th>
                <th className="px-4 py-3 font-semibold text-right">Prix U.</th>
                <th className="px-4 py-3 font-semibold text-right">Sous-total</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Aucune vente</td></tr>
              )}
              {filtered.map((it) => (
                <tr key={it.id} className={`border-t border-slate-200 dark:border-slate-800 ${it.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(it.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3 font-mono text-xs">{it.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium">{it.product?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.customer?.name || <span className="text-slate-400 italic">passage</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold">{it.quantity}</td>
                  <td className="px-4 py-3 text-right">{it.unitPrice.toFixed(2)} DA</td>
                  <td className="px-4 py-3 text-right font-semibold">{it.subtotal.toFixed(2)} DA</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      it.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      it.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => downloadInvoice(it.saleId)} className="rounded p-1.5 hover:bg-brand-100 text-brand-600 dark:hover:bg-brand-900/30" title="Télécharger PDF">
                      <Receipt size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">Total (lignes affichées):</td>
                  <td className="px-4 py-3 text-right">{filtered.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td></td>
                  <td className="px-4 py-3 text-right text-brand-600">
                    {filtered.reduce((s, i) => s + i.subtotal, 0).toFixed(2)} DA
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
