import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import materialsRoutes from './routes/materials.js';
import productsRoutes from './routes/products.js';
import suppliersRoutes from './routes/suppliers.js';
import dashboardRoutes from './routes/dashboard.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import recipesRoutes from './routes/recipes.js';
import productionRoutes from './routes/production.js';
import purchasesRoutes from './routes/purchases.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'MoniaGauf API', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/purchases', purchasesRoutes);

// Serve built frontend (production mode) — single port for everything
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../../frontend/dist');
const serveFrontend = process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true';

if (serveFrontend) {
  app.use(express.static(distPath));
  // SPA fallback for client-side routing (must come AFTER /api routes)
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 MoniaGauf running on http://localhost:${PORT}`);
  if (serveFrontend) console.log(`📦 Serving frontend from ${distPath}`);
});
