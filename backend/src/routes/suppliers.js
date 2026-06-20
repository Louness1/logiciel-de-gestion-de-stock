import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),  // accepte vide, null, ou n'importe quel texte
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get('/', async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { materials: true } } },
  });
  res.json({ data: suppliers });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { materials: true },
  });
  if (!supplier) return res.status(404).json({ error: 'Not found' });
  res.json({ data: supplier });
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const supplier = await prisma.supplier.create({ data: parsed.data });
  res.status(201).json({ data: supplier });
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const supplier = await prisma.supplier.update({ where: { id }, data: parsed.data });
  res.json({ data: supplier });
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.supplier.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
