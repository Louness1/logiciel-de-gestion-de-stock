import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/stats', async (_req, res) => {
  const [
    totalMaterials,
    totalProducts,
    totalSuppliers,
    totalUsers,
    materials,
    products,
  ] = await Promise.all([
    prisma.rawMaterial.count(),
    prisma.finishedProduct.count(),
    prisma.supplier.count(),
    prisma.user.count(),
    prisma.rawMaterial.findMany(),
    prisma.finishedProduct.findMany(),
  ]);

  const lowStockMaterials = materials.filter((m) => m.quantity <= m.minQuantity).length;
  const lowStockProducts = products.filter((p) => p.quantity <= p.minQuantity).length;

  const totalProductQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalMaterialQuantity = materials.reduce((sum, m) => sum + m.quantity, 0);
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = materials.filter((m) => m.expiryDate && new Date(m.expiryDate) <= soon).length;

  // category breakdown for chart
  const materialsByCategory = {};
  for (const m of materials) {
    materialsByCategory[m.category] = (materialsByCategory[m.category] || 0) + m.quantity;
  }
  const productsByCategory = {};
  for (const p of products) {
    productsByCategory[p.category] = (productsByCategory[p.category] || 0) + p.quantity;
  }

  res.json({
    counts: { materials: totalMaterials, products: totalProducts, suppliers: totalSuppliers, users: totalUsers },
    alerts: { lowStockMaterials, lowStockProducts, expiringSoon },
    quantities: { totalProductQuantity, totalMaterialQuantity, inventoryValue },
    charts: {
      materialsByCategory: Object.entries(materialsByCategory).map(([name, value]) => ({ name, value })),
      productsByCategory: Object.entries(productsByCategory).map(([name, value]) => ({ name, value })),
    },
  });
});

router.get('/recent-activity', async (_req, res) => {
  const activities = await prisma.activityLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, email: true, role: true } } },
  });
  res.json({ data: activities });
});

export default router;
