import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const materialSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().default('kg'),
  quantity: z.number().nonnegative().default(0),
  minQuantity: z.number().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  expiryDate: z.string().datetime().optional().nullable(),
  supplierId: z.number().int().optional().nullable(),
});

router.get('/', async (req, res) => {
  const { search, category, lowStock } = req.query;
  const where = {};
  if (search) where.name = { contains: String(search) };
  if (category) where.category = String(category);

  let materials = await prisma.rawMaterial.findMany({
    where,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (lowStock === 'true') {
    materials = materials.filter((m) => m.quantity <= m.minQuantity);
  }

  res.json({ data: materials });
});

router.get('/alerts', async (_req, res) => {
  const all = await prisma.rawMaterial.findMany({
    include: { supplier: { select: { id: true, name: true } } },
  });
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lowStock = all.filter((m) => m.quantity <= m.minQuantity);
  const expiring = all.filter((m) => m.expiryDate && new Date(m.expiryDate) <= soon);
  res.json({ lowStock, expiring });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const material = await prisma.rawMaterial.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!material) return res.status(404).json({ error: 'Not found' });
  res.json({ data: material });
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = materialSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const data = { ...parsed.data };
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
  const material = await prisma.rawMaterial.create({ data });
  res.status(201).json({ data: material });
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = materialSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const data = { ...parsed.data };
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
  const material = await prisma.rawMaterial.update({ where: { id }, data });
  res.json({ data: material });
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.rawMaterial.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
