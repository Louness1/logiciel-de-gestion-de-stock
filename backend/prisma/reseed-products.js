// Reseed FinishedProducts + RecipeIngredient (recettes BOM).
// Replaces existing products with the 8 real MoniaGauf products and inserts their recipes.
// Usage: npm run db:reseed-products
//
// ⚠️ ATTENTION: supprime les ventes existantes (cascade via SaleItem -> Sale)
// car les FinishedProduct existants sont remplacés.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// === RECIPES (per 1 unit, in the material's native unit kg or L) ===
// Conversion: 44.64 g => 0.04464 kg

// Pieces par carton selon la taille
const PIECES_PER_CARTON = { 40: 48, 150: 24 };

// Recette par CARTON — valeurs réelles fournies par l'usine MoniaGauf
// L'emballage carton dépend du parfum (4 types: Fraise/Citron/Vanille/Chocolat)
function baseRecipe(size, flavor) {
  const flavorLabel = FLAVOR_LABEL[flavor];
  const embName = `Emballage carton ${flavorLabel}`;
  if (size === 40) {
    return {
      'Farine de blé':         0.714,    // 714 g / carton
      'Graisse végétale':      0.238,    // 238 g
      'Sucre':                 0.209,    // 209 g
      'Lécithine':             0.00857,  // 8.57 g
      'Ammonium':              0.00371,  // 3.71 g
      'Bicarbonate de sodium': 0.00257,  // 2.57 g
      'Sel':                   0.00571,  // 5.71 g
      [embName]:               1,        // 1 carton d'emballage du bon parfum
    };
  }
  if (size === 150) {
    return {
      'Farine de blé':         1.316,    // 1316 g
      'Graisse végétale':      0.439,    // 439 g
      'Sucre':                 0.386,    // 386 g
      'Lécithine':             0.01579,  // 15.79 g
      'Ammonium':              0.00684,  // 6.84 g
      'Bicarbonate de sodium': 0.00474,  // 4.74 g
      'Sel':                   0.01053,  // 10.53 g
      [embName]:               1,
    };
  }
  throw new Error('Unknown size: ' + size);
}

// Flavor-specific ingredient (arôme or cacao)
// Ingrédient parfumant par CARTON (valeurs réelles fournies)
// Arômes liquides en L (≈ 1 g/mL → 1.43 g ≈ 0.00143 L) ; Cacao en kg.
const FLAVOR_INGREDIENT = {
  fraise:   { material: 'Arôme Fraise',  qtyBy40g: 0.00143,  qtyBy150g: 0.00263 },
  citron:   { material: 'Arôme Citron',  qtyBy40g: 0.00095,  qtyBy150g: 0.00175 },
  vanille:  { material: 'Arôme Vanille', qtyBy40g: 0.00095,  qtyBy150g: 0.00175 },
  chocolat: { material: 'Cacao',         qtyBy40g: 0.01143,  qtyBy150g: 0.02105 },
};

const FLAVOR_LABEL = { fraise: 'Fraise', citron: 'Citron', vanille: 'Vanille', chocolat: 'Chocolat' };
const FLAVOR_SKU   = { fraise: 'FR',     citron: 'CT',     vanille: 'VN',     chocolat: 'CH' };
const FLAVOR_CAT   = {
  fraise:   'gaufrette_fraise',
  citron:   'gaufrette_citron',
  vanille:  'gaufrette_vanille',
  chocolat: 'gaufrette_chocolat',
};

// Prix de vente PAR CARTON (DA) — modifiables ensuite via l'UI Produits
const PRICES = {
  '40-fraise':   1200, '40-citron':   1200, '40-vanille':   1200, '40-chocolat':   1440,
  '150-fraise': 2160, '150-citron':  2160, '150-vanille':  2160, '150-chocolat':  2400,
};

async function main() {
  console.log('🧹 Reset des produits finis et recettes...');

  // Clean cascade: SaleItem -> Sale, ProductionMaterial -> Production, RecipeIngredient -> FinishedProduct
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productionMaterial.deleteMany();
  await prisma.production.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.finishedProduct.deleteMany();

  // Build material name -> id map
  const materials = await prisma.rawMaterial.findMany();
  const matByName = Object.fromEntries(materials.map((m) => [m.name, m]));

  function ensureMat(name) {
    const m = matByName[name];
    if (!m) throw new Error(`Matière introuvable: "${name}". Lance d'abord npm run db:reseed-materials.`);
    return m;
  }

  console.log('🍪 Création des 8 produits + recettes...');
  const flavors = ['fraise', 'citron', 'vanille', 'chocolat'];
  const sizes = [40, 150];

  for (const size of sizes) {
    for (const flavor of flavors) {
      const sku = `GF${FLAVOR_SKU[flavor]}-${size}`;
      const piecesPerCarton = PIECES_PER_CARTON[size];
      const name = `Gaufrette ${FLAVOR_LABEL[flavor]} ${size}g (Carton ${piecesPerCarton}u)`;
      const price = PRICES[`${size}-${flavor}`];

      const product = await prisma.finishedProduct.create({
        data: {
          name,
          category: FLAVOR_CAT[flavor],
          sku,
          price,
          quantity: 0,
          minQuantity: 5, // 5 cartons en stock minimum (alerte stock faible)
          description: `${piecesPerCarton} pièces de ${size}g par carton — fabriqué à l'usine MoniaGauf`,
        },
      });

      // Build the recipe = base + flavor-specific
      const base = baseRecipe(size, flavor);
      const fi = FLAVOR_INGREDIENT[flavor];
      const flavorQty = size === 40 ? fi.qtyBy40g : fi.qtyBy150g;

      const recipeEntries = [
        ...Object.entries(base),
        [fi.material, flavorQty],
      ];

      for (const [matName, qty] of recipeEntries) {
        const mat = ensureMat(matName);
        await prisma.recipeIngredient.create({
          data: {
            productId: product.id,
            materialId: mat.id,
            quantityPerUnit: qty,
          },
        });
      }
      console.log(`   ✓ ${name} (${sku}) — ${recipeEntries.length} ingrédients`);
    }
  }

  console.log('');
  console.log('✅ 8 produits + 64 ingrédients de recette insérés');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
