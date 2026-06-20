import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional().nullable(),
  price: z.number().nonnegative().default(0),
  quantity: z.number().int().nonnegative().default(0),
  minQuantity: z.number().int().nonnegative().default(0),
  description: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  const { search, category } = req.query;
  const where = {};
  if (search) where.name = { contains: String(search) };
  if (category) where.category = String(category);
  const products = await prisma.finishedProduct.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ data: products });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.finishedProduct.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json({ data: product });
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const product = await prisma.finishedProduct.create({ data: parsed.data });
  res.status(201).json({ data: product });
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const product = await prisma.finishedProduct.update({ where: { id }, data: parsed.data });
  res.json({ data: product });
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.finishedProduct.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
