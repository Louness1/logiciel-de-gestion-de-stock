import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/recipes — list all products with their recipe ingredient count
router.get('/', async (_req, res) => {
  const products = await prisma.finishedProduct.findMany({
    orderBy: { name: 'asc' },
    include: {
      recipe: { include: { material: true } },
    },
  });
  res.json({ data: products });
});

// GET /api/recipes/:productId — get the recipe for a single product
router.get('/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  const product = await prisma.finishedProduct.findUnique({
    where: { id: productId },
    include: { recipe: { include: { material: true } } },
  });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json({ data: product });
});

// PUT /api/recipes/:productId — replace recipe ingredients
const recipeSchema = z.object({
  ingredients: z.array(z.object({
    materialId: z.number().int(),
    quantityPerUnit: z.number().nonnegative(),
  })),
});

router.put('/:productId', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const productId = Number(req.params.productId);
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const product = await prisma.finishedProduct.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { productId } });
    for (const ing of parsed.data.ingredients) {
      if (ing.quantityPerUnit > 0) {
        await tx.recipeIngredient.create({
          data: { productId, materialId: ing.materialId, quantityPerUnit: ing.quantityPerUnit },
        });
      }
    }
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_RECIPE',
        entity: 'FinishedProduct',
        entityId: productId,
        details: `${parsed.data.ingredients.length} ingrédients`,
      },
    });
  });

  const updated = await prisma.finishedProduct.findUnique({
    where: { id: productId },
    include: { recipe: { include: { material: true } } },
  });
  res.json({ data: updated });
});

export default router;
