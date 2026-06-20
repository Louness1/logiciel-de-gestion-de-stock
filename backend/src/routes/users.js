import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT'];

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(ROLES),
  isActive: z.boolean().optional(),
});

router.get('/', requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: users });
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { password, ...rest } = parsed.data;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { ...rest, password: hashed },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    res.status(201).json({ data: user });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const data = { ...parsed.data };
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  res.json({ data: user });
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
