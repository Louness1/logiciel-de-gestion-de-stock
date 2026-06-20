import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const productionSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

// GET /api/production — list all productions
router.get('/', async (_req, res) => {
  const productions = await prisma.production.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      user: { select: { fullName: true, email: true } },
      materials: { include: { material: true } },
    },
  });
  res.json({ data: productions });
});

// GET /api/production/preview/:productId/:quantity — preview material requirements without creating
router.get('/preview/:productId/:quantity', async (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.params.quantity);
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Quantité invalide' });

  const product = await prisma.finishedProduct.findUnique({
    where: { id: productId },
    include: { recipe: { include: { material: true } } },
  });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  if (product.recipe.length === 0) return res.status(400).json({ error: 'Aucune recette définie pour ce produit' });

  const requirements = product.recipe.map((r) => {
    const totalNeeded = r.quantityPerUnit * quantity;
    const sufficient = r.material.quantity >= totalNeeded;
    return {
      materialId: r.materialId,
      materialName: r.material.name,
      unit: r.material.unit,
      quantityPerUnit: r.quantityPerUnit,
      totalNeeded,
      currentStock: r.material.quantity,
      sufficient,
      missing: sufficient ? 0 : totalNeeded - r.material.quantity,
    };
  });

  const allSufficient = requirements.every((r) => r.sufficient);
  res.json({ product, quantity, requirements, allSufficient });
});

// POST /api/production — create PENDING production order (no stock changes)
router.post('/', requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  const parsed = productionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { productId, quantity, notes } = parsed.data;

  try {
    const product = await prisma.finishedProduct.findUnique({
      where: { id: productId },
      include: { recipe: true },
    });
    if (!product) throw new Error('Produit introuvable');
    if (product.recipe.length === 0) throw new Error(`Aucune recette définie pour "${product.name}"`);

    const production = await prisma.production.create({
      data: {
        productId,
        quantity,
        status: 'PENDING',
        notes: notes || null,
        userId: req.user.id,
      },
      include: {
        product: true,
        user: { select: { fullName: true, email: true } },
        materials: { include: { material: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PRODUCTION_ORDER',
        entity: 'Production',
        entityId: production.id,
        details: `Ordre PENDING: ${quantity} × ${product.name}`,
      },
    });

    res.status(201).json({ data: production });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur création ordre' });
  }
});

// PATCH /api/production/:id/complete — verify stock, decrement materials, increment product
router.patch('/:id/complete', requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const production = await tx.production.findUnique({
        where: { id },
        include: { product: { include: { recipe: { include: { material: true } } } } },
      });
      if (!production) throw new Error('Ordre introuvable');
      if (production.status !== 'PENDING') throw new Error(`Ordre déjà ${production.status}, impossible de compléter`);

      const recipe = production.product.recipe;
      if (recipe.length === 0) throw new Error('Aucune recette définie pour ce produit');

      // Verify stock for every ingredient
      const shortages = [];
      for (const r of recipe) {
        const needed = r.quantityPerUnit * production.quantity;
        if (r.material.quantity < needed) {
          shortages.push(`${r.material.name} (besoin: ${needed.toFixed(3)} ${r.material.unit}, disponible: ${r.material.quantity} ${r.material.unit})`);
        }
      }
      if (shortages.length > 0) throw new Error(`Stock insuffisant: ${shortages.join('; ')}`);

      // Decrement raw materials + create ProductionMaterial records
      for (const r of recipe) {
        const used = r.quantityPerUnit * production.quantity;
        await tx.rawMaterial.update({
          where: { id: r.materialId },
          data: { quantity: { decrement: used } },
        });
        await tx.productionMaterial.create({
          data: { productionId: production.id, materialId: r.materialId, quantityUsed: used },
        });
      }

      // Increment finished product stock
      await tx.finishedProduct.update({
        where: { id: production.productId },
        data: { quantity: { increment: production.quantity } },
      });

      // Mark as completed
      const updated = await tx.production.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: {
          product: true,
          user: { select: { fullName: true, email: true } },
          materials: { include: { material: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'COMPLETE_PRODUCTION',
          entity: 'Production',
          entityId: id,
          details: `+${production.quantity} × ${production.product.name}`,
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur complétion' });
  }
});

// PATCH /api/production/:id/cancel — mark as NOT_COMPLETED (no stock change)
router.patch('/:id/cancel', requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const production = await prisma.production.findUnique({ where: { id } });
    if (!production) return res.status(404).json({ error: 'Ordre introuvable' });
    if (production.status !== 'PENDING') {
      return res.status(400).json({ error: `Ordre déjà ${production.status}` });
    }
    const updated = await prisma.production.update({
      where: { id },
      data: { status: 'NOT_COMPLETED' },
      include: {
        product: true,
        user: { select: { fullName: true, email: true } },
        materials: { include: { material: true } },
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CANCEL_PRODUCTION',
        entity: 'Production',
        entityId: id,
        details: `Ordre annulé`,
      },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/production/:id — only for PENDING orders (cleanup)
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const production = await prisma.production.findUnique({ where: { id } });
    if (!production) return res.status(404).json({ error: 'Ordre introuvable' });
    if (production.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Impossible de supprimer un ordre COMPLETED (stock déjà appliqué)' });
    }
    await prisma.production.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
