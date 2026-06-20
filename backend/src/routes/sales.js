import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const saleSchema = z.object({
  customerId: z.number().int().optional().nullable(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).default('PAID'),
  notes: z.string().optional().nullable(),
  tvaRate: z.number().min(0).max(100).default(0),
  remiseHT: z.number().min(0).default(0),
  montantVerse: z.number().min(0).default(0),
  items: z.array(z.object({
    productId: z.number().int(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.sale.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { id: 'desc' },
    select: { invoiceNo: true },
  });
  let next = 1;
  if (last) {
    const n = parseInt(last.invoiceNo.slice(prefix.length), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return prefix + String(next).padStart(5, '0');
}

router.get('/', async (req, res) => {
  const { from, to, customerId } = req.query;
  const where = {};
  if (customerId) where.customerId = Number(customerId);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }
  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: sales });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: 'Not found' });
  res.json({ data: sale });
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { items, customerId, status, notes, tvaRate, remiseHT, montantVerse } = parsed.data;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // Verify stock for every item
      for (const item of items) {
        const p = await tx.finishedProduct.findUnique({ where: { id: item.productId } });
        if (!p) throw new Error(`Produit #${item.productId} introuvable`);
        if (p.quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour "${p.name}" (disponible: ${p.quantity}, demandé: ${item.quantity})`);
        }
      }

      // Calculs HT/TVA/TTC
      const sumSubtotals = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const totalHT = Math.max(0, sumSubtotals - remiseHT);
      const totalTVA = totalHT * (tvaRate / 100);
      const totalTTC = totalHT + totalTVA;
      const invoiceNo = await nextInvoiceNumber();

      const created = await tx.sale.create({
        data: {
          invoiceNo,
          customerId: customerId || null,
          status,
          notes: notes || null,
          total: totalTTC,
          tvaRate,
          remiseHT,
          montantVerse,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // Decrement stock only when sale is not cancelled
      if (status !== 'CANCELLED') {
        for (const item of items) {
          await tx.finishedProduct.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE_SALE',
          entity: 'Sale',
          entityId: created.id,
          details: `Facture ${invoiceNo} — ${totalTTC.toFixed(2)} DA`,
        },
      });

      return created;
    });

    res.status(201).json({ data: sale });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur création vente' });
  }
});

// PUT /api/sales/:id — modifier une vente (recalcule stock automatiquement)
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { items, customerId, status, notes, tvaRate, remiseHT, montantVerse } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const old = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!old) throw new Error('Vente introuvable');

      // 1. Restaurer le stock des anciens items (si l'ancienne vente n'était pas annulée)
      if (old.status !== 'CANCELLED') {
        for (const it of old.items) {
          await tx.finishedProduct.update({
            where: { id: it.productId },
            data: { quantity: { increment: it.quantity } },
          });
        }
      }

      // 2. Vérifier le stock pour les nouveaux items (si le nouveau statut n'est pas annulé)
      if (status !== 'CANCELLED') {
        for (const item of items) {
          const p = await tx.finishedProduct.findUnique({ where: { id: item.productId } });
          if (!p) throw new Error(`Produit #${item.productId} introuvable`);
          if (p.quantity < item.quantity) {
            throw new Error(`Stock insuffisant pour "${p.name}" (disponible: ${p.quantity}, demandé: ${item.quantity})`);
          }
        }
      }

      // 3. Supprimer anciens items
      await tx.saleItem.deleteMany({ where: { saleId: id } });

      // 4. Recalculer totaux
      const sumSubtotals = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const totalHT = Math.max(0, sumSubtotals - remiseHT);
      const totalTVA = totalHT * (tvaRate / 100);
      const totalTTC = totalHT + totalTVA;

      // 5. Mettre à jour la vente + créer nouveaux items
      const sale = await tx.sale.update({
        where: { id },
        data: {
          customerId: customerId || null,
          status,
          notes: notes || null,
          total: totalTTC,
          tvaRate,
          remiseHT,
          montantVerse,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      });

      // 6. Décrémenter le stock pour les nouveaux items (si nouveau statut actif)
      if (status !== 'CANCELLED') {
        for (const item of items) {
          await tx.finishedProduct.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_SALE',
          entity: 'Sale',
          entityId: id,
          details: `Vente ${old.invoiceNo} modifiée — ${totalTTC.toFixed(2)} DA`,
        },
      });

      return sale;
    });

    res.json({ data: updated });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur modification' });
  }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) throw new Error('Not found');
      // Restore stock if sale was active
      if (sale.status !== 'CANCELLED') {
        for (const it of sale.items) {
          await tx.finishedProduct.update({
            where: { id: it.productId },
            data: { quantity: { increment: it.quantity } },
          });
        }
      }
      await tx.sale.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
