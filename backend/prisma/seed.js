import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MoniaGauf database...');

  // Single user (Messoudi)
  const hashed = (p) => bcrypt.hashSync(p, 10);
  await prisma.user.upsert({
    where: { email: 'messoudigauf@moniagauf.com' },
    update: {},
    create: {
      email: 'messoudigauf@moniagauf.com',
      password: hashed('hafid2026'),
      fullName: 'Messoudi',
      role: 'ADMIN',
    },
  });

  // Suppliers
  const supA = await prisma.supplier.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Moulin El-Baraka',   phone: '+213 555 11 22 33', email: 'contact@elbaraka.dz', address: 'Alger, Algérie' },
  });
  const supB = await prisma.supplier.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Sucrerie Algérienne', phone: '+213 555 44 55 66', email: 'info@sucrerie.dz',     address: 'Oran, Algérie' },
  });
  const supC = await prisma.supplier.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'Chocolaterie Premium',phone: '+213 555 77 88 99', email: 'sales@chocopremium.dz',address: 'Béjaïa, Algérie' },
  });

  // Raw materials — matières utilisées dans l'usine MoniaGauf
  const materials = [
    // Pâte
    { name: 'Ammonium',              category: 'pate', unit: 'kg', quantity: 50,  minQuantity: 10,  unitPrice: 600,  supplierId: supB.id },
    { name: 'Bicarbonate de sodium', category: 'pate', unit: 'kg', quantity: 80,  minQuantity: 15,  unitPrice: 250,  supplierId: supB.id },
    { name: 'Lécithine',             category: 'pate', unit: 'kg', quantity: 30,  minQuantity: 5,   unitPrice: 1200, supplierId: supC.id },
    { name: 'Sel',                   category: 'pate', unit: 'kg', quantity: 100, minQuantity: 20,  unitPrice: 60,   supplierId: supA.id },
    { name: 'Farine de blé',         category: 'pate', unit: 'kg', quantity: 500, minQuantity: 100, unitPrice: 80,   supplierId: supA.id, expiryDate: new Date('2026-09-30') },
    // Crème
    { name: 'Graisse végétale',  category: 'creme', unit: 'kg', quantity: 200, minQuantity: 40, unitPrice: 350,  supplierId: supA.id, expiryDate: new Date('2026-11-20') },
    { name: 'Sucre',             category: 'creme', unit: 'kg', quantity: 300, minQuantity: 50, unitPrice: 120,  supplierId: supB.id, expiryDate: new Date('2027-01-15') },
    { name: 'Cacao',             category: 'creme', unit: 'kg', quantity: 80,  minQuantity: 15, unitPrice: 950,  supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Citron',      category: 'creme', unit: 'L',  quantity: 15,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Vanille',     category: 'creme', unit: 'L',  quantity: 18,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    { name: 'Arôme Fraise',      category: 'creme', unit: 'L',  quantity: 15,  minQuantity: 3,  unitPrice: 1500, supplierId: supC.id, expiryDate: new Date('2027-03-01') },
    // Emballage — 4 types par parfum
    { name: 'Emballage carton Fraise',   category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Citron',   category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Vanille',  category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
    { name: 'Emballage carton Chocolat', category: 'emballage', unit: 'unité', quantity: 1500, minQuantity: 300, unitPrice: 8 },
  ];
  for (const m of materials) {
    const existing = await prisma.rawMaterial.findFirst({ where: { name: m.name } });
    if (!existing) await prisma.rawMaterial.create({ data: m });
  }

  // Finished products
  const products = [
    { name: 'Gaufrette Chocolat 50g', category: 'gaufrette_chocolat', sku: 'GFCH-50',  price: 60,  quantity: 1200, minQuantity: 200, description: 'Gaufrette enrobée chocolat noir' },
    { name: 'Gaufrette Vanille 50g',  category: 'gaufrette_vanille',  sku: 'GFVN-50',  price: 50,  quantity: 800,  minQuantity: 200, description: 'Gaufrette saveur vanille' },
    { name: 'Gaufrette Chocolat 100g',category: 'gaufrette_chocolat', sku: 'GFCH-100', price: 110, quantity: 300,  minQuantity: 100, description: 'Format familial' },
    { name: 'Gaufrette Citron 50g',   category: 'gaufrette_citron',   sku: 'GFCT-50',  price: 55,  quantity: 600,  minQuantity: 150, description: 'Gaufrette saveur citron' },
    { name: 'Gaufrette Fraise 50g',   category: 'gaufrette_fraise',   sku: 'GFFR-50',  price: 55,  quantity: 700,  minQuantity: 150, description: 'Gaufrette saveur fraise' },
  ];
  for (const p of products) {
    await prisma.finishedProduct.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }

  console.log('✅ Seed complete');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('  messoudigauf@moniagauf.com / hafid2026');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
