import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  rc: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  siegeSocial: z.string().optional().nullable(),
});

router.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { sales: true } } },
  });
  res.json({ data: customers });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { sales: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json({ data: customer });
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json({ data: customer });
});

router.put('/:id', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  res.json({ data: customer });
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.customer.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
