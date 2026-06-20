import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id },
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.post('/logout', authenticate, async (req, res) => {
  await prisma.activityLog.create({
    data: { userId: req.user.id, action: 'LOGOUT', entity: 'User', entityId: req.user.id },
  });
  res.json({ ok: true });
});

export default router;
