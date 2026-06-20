import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const purchaseSchema = z.object({
  supplierId: z.number().int().optional().nullable(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).default('PAID'),
  notes: z.string().optional().nullable(),
  tvaRate: z.number().min(0).max(100).default(0),
  items: z.array(z.object({
    materialId: z.number().int(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
  updatePrice: z.boolean().optional(),
});

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `ACH-${year}-`;
  const last = await prisma.purchase.findFirst({
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
  const { from, to, supplierId } = req.query;
  const where = {};
  if (supplierId) where.supplierId = Number(supplierId);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }
  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      supplier: true,
      items: { include: { material: true } },
      user: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: purchases });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { material: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json({ data: purchase });
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { items, supplierId, status, notes, tvaRate, updatePrice } = parsed.data;

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      // Verify all materials exist
      for (const it of items) {
        const m = await tx.rawMaterial.findUnique({ where: { id: it.materialId } });
        if (!m) throw new Error(`Matière #${it.materialId} introuvable`);
      }

      const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const invoiceNo = await nextInvoiceNumber();

      const created = await tx.purchase.create({
        data: {
          invoiceNo,
          supplierId: supplierId || null,
          status,
          notes: notes || null,
          total,
          tvaRate,
          userId: req.user.id,
          items: {
            create: items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { material: true } },
          user: { select: { fullName: true, email: true } },
        },
      });

      // INCREMENT raw materials stock (sauf si CANCELLED)
      if (status !== 'CANCELLED') {
        for (const it of items) {
          const updateData = { quantity: { increment: it.quantity } };
          if (updatePrice) updateData.unitPrice = it.unitPrice;
          await tx.rawMaterial.update({
            where: { id: it.materialId },
            data: updateData,
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE_PURCHASE',
          entity: 'Purchase',
          entityId: created.id,
          details: `Bon ${invoiceNo} — ${total.toFixed(2)} DA`,
        },
      });

      return created;
    });

    res.status(201).json({ data: purchase });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur création achat' });
  }
});

// PUT /api/purchases/:id — modifier un achat (recalcule stock automatiquement)
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { items, supplierId, status, notes, tvaRate, updatePrice } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const old = await tx.purchase.findUnique({ where: { id }, include: { items: true } });
      if (!old) throw new Error('Bon d\'achat introuvable');

      // 1. Reverser les anciens incréments de stock (si l'ancien bon n'était pas annulé)
      if (old.status !== 'CANCELLED') {
        for (const it of old.items) {
          await tx.rawMaterial.update({
            where: { id: it.materialId },
            data: { quantity: { decrement: it.quantity } },
          });
        }
      }

      // 2. Vérifier que les nouvelles matières existent
      for (const it of items) {
        const m = await tx.rawMaterial.findUnique({ where: { id: it.materialId } });
        if (!m) throw new Error(`Matière #${it.materialId} introuvable`);
      }

      // 3. Supprimer anciens items
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

      const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

      // 4. Mettre à jour le bon + créer nouveaux items
      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          supplierId: supplierId || null,
          status,
          notes: notes || null,
          total,
          tvaRate,
          items: {
            create: items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { material: true } },
          user: { select: { fullName: true, email: true } },
        },
      });

      // 5. Réincrémenter le stock pour les nouveaux items (si nouveau statut actif)
      if (status !== 'CANCELLED') {
        for (const it of items) {
          const updateData = { quantity: { increment: it.quantity } };
          if (updatePrice) updateData.unitPrice = it.unitPrice;
          await tx.rawMaterial.update({
            where: { id: it.materialId },
            data: updateData,
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_PURCHASE',
          entity: 'Purchase',
          entityId: id,
          details: `Bon ${old.invoiceNo} modifié — ${total.toFixed(2)} DA`,
        },
      });

      return purchase;
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
      const purchase = await tx.purchase.findUnique({ where: { id }, include: { items: true } });
      if (!purchase) throw new Error('Not found');
      // Si le bon était actif, on RETIRE les quantités du stock
      if (purchase.status !== 'CANCELLED') {
        for (const it of purchase.items) {
          await tx.rawMaterial.update({
            where: { id: it.materialId },
            data: { quantity: { decrement: it.quantity } },
          });
        }
      }
      await tx.purchase.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
