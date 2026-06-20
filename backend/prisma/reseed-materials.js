// Reseed only RawMaterial table — preserves users, customers, sales, products.
// Usage: npm run db:reseed-materials

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Resetting raw materials...');

  // Clear all rows referencing RawMaterial first (FK)
  await prisma.productionMaterial.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.rawMaterial.deleteMany();

  // Suppliers (keep existing or create them)
  const supA = await prisma.supplier.upsert({
    where: { id: 1 }, update: {},
    create: { name: 'Moulin El-Baraka',     phone: '+213 555 11 22 33', email: 'contact@elbaraka.dz', address: 'Alger, Algérie' },
  });
  const supB = await prisma.supplier.upsert({
    where: { id: 2 }, update: {},
    create: { name: 'Sucrerie Algérienne',  phone: '+213 555 44 55 66', email: 'info@sucrerie.dz',     address: 'Oran, Algérie' },
  });
  const supC = await prisma.supplier.upsert({
    where: { id: 3 }, update: {},
    create: { name: 'Chocolaterie Premium', phone: '+213 555 77 88 99', email: 'sales@chocopremium.dz',address: 'Béjaïa, Algérie' },
  });

  // === MATIÈRES PREMIÈRES POUR LA PÂTE ===
  const pate = [
    { name: 'Ammonium',              category: 'pate', unit: 'kg', quantity: 50,  minQuantity: 10,  unitPrice: 600,  supplierId: supB.id },
    { name: 'Bicarbonate de sodium', category: 'pate', unit: 'kg', quantity: 80,  minQuantity: 15,  unitPrice: 250,  supplierId: supB.id },
    { name: 'Lécithine',             category: 'pate', unit: 'kg', quantity: 30,  minQuantity: 5,   unitPrice: 1200, supplierId: supC.id },
    { name: 'Sel',                   category: 'pate', unit: 'kg', quantity: 100, minQuantity: 20,  unitPrice: 60,   supplierId: supA.id },
    { name: 'Farine de blé',         category: 'pate', unit: 'kg', quantity: 500, minQuantity: 100, unitPrice: 80,   supplierId: supA.id, expiryDate: new Date('2026-09-30') },
  ];

  // === MATIÈRES PREMIÈRES POUR LA CRÈME ===
  const creme = [
    { name: 'Graisse végétale',  category: 'creme', unit: 'kg', quantity: 200, minQuantity: 40, unitPrice: 350,  supplierId: supA.id, expiryDate: new Date('2026-11-20') },
    { name: 'Sucre',             category: 'creme', unit: 'kg', quantity: 300, minQuantity: 50, unitPrice: 120,  supplierId: supB.id, expiryDate: new Date('2027-01-15') },
    { name: 'Cacao',             category: 'creme', unit: 'kg', quantity: 80,  minQuantity: 15, unitPrice: 950,  supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Citron',      category: 'creme', unit: 'L',  quantity: 15,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Vanille',     category: 'creme', unit: 'L',  quantity: 18,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Fraise',      category: 'creme', unit: 'L',  quantity: 15,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
  ];

  // === EMBALLAGE (4 types, 1 par parfum) ===
  const emb = [
    { name: 'Emballage carton Fraise',   category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Citron',   category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Vanille',  category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Chocolat', category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
  ];

  for (const m of [...pate, ...creme, ...emb]) {
    await prisma.rawMaterial.create({ data: m });
  }

  const totalCount = pate.length + creme.length + emb.length;
  console.log(`✅ ${totalCount} matières premières insérées`);
  console.log(`   • Pâte: ${pate.length} (${pate.map(m => m.name).join(', ')})`);
  console.log(`   • Crème: ${creme.length} (${creme.map(m => m.name).join(', ')})`);
  console.log(`   • Emballage: ${emb.length} (${emb.map(m => m.name).join(', ')})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
