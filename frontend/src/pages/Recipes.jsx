import { useEffect, useState } from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';
import { api } from '../lib/api';

function formatQty(qty, unit) {
  if (unit === 'kg' && qty < 1) return `${(qty * 1000).toFixed(2)} g`;
  if (unit === 'L' && qty < 1) return `${(qty * 1000).toFixed(2)} mL`;
  if (unit === 'unité' && qty < 1) {
    // express as 1/N for clarity (e.g. 0.0208 -> "1/48 carton")
    const ratio = Math.round(1 / qty);
    if (Math.abs(qty - 1 / ratio) < 0.0001) return `1/${ratio} ${unit}`;
    return `${qty.toFixed(4)} ${unit}`;
  }
  return `${qty.toFixed(3)} ${unit}`;
}

export default function Recipes() {
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/recipes').then((r) => setProducts(r.data.data));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Recettes (BOM)</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Composition de chaque produit fini — quantité de matière consommée pour <strong>1 carton</strong>
        </p>
      </div>

      <div className="space-y-3">
        {products.length === 0 && <div className="text-slate-400 text-sm">Aucune recette</div>}
        {products.map((p) => {
          const open = expanded === p.id;
          return (
            <div key={p.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : p.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-brand-500" />
                  <div className="text-left">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      SKU: {p.sku || '—'} · {p.recipe.length} ingrédients · Prix: {p.price} DA · Stock: {p.quantity}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className={`transition ${open ? 'rotate-90' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-slate-50 dark:bg-slate-900/40">
                  {p.recipe.length === 0 ? (
                    <div className="text-sm text-slate-400">Aucune recette définie</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase">
                          <th className="py-2">Ingrédient</th>
                          <th className="py-2">Catégorie</th>
                          <th className="py-2 text-right">Quantité par carton</th>
                          <th className="py-2 text-right">Stock actuel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.recipe.map((r) => (
                          <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="py-2 font-medium">{r.material.name}</td>
                            <td className="py-2 text-slate-500 capitalize">{r.material.category}</td>
                            <td className="py-2 text-right font-mono">{formatQty(r.quantityPerUnit, r.material.unit)}</td>
                            <td className="py-2 text-right text-slate-500">{r.material.quantity} {r.material.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
