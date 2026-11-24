import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js'; // must be imported first: validates env vars
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`StockFlow API listening on http://localhost:${config.port}`);
});
