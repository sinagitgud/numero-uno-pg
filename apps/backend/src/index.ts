import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth';
import { propertyRoutes } from './routes/properties';
import { roomRoutes } from './routes/rooms';
import { tenantRoutes } from './routes/tenants';
import { invoiceRoutes } from './routes/invoices';
import { paymentRoutes } from './routes/payments';
import { expenseRoutes } from './routes/expenses';
import { staffRoutes } from './routes/staff';
import { capexRoutes } from './routes/capex';
import { investmentRoutes } from './routes/investments';
import { ticketRoutes } from './routes/tickets';
import { dashboardRoutes } from './routes/dashboard';
import { goalRoutes } from './routes/goals';
import { uploadRoutes } from './routes/upload';
import { notificationRoutes } from './routes/notifications';
import { guestRoutes } from './routes/guests';
import { leaveRoutes } from './routes/leaves';
import { menuRoutes } from './routes/menu';
import { inquiryRoutes } from './routes/inquiries';
import { entryExitRoutes } from './routes/entryexit';
import { startCronJobs } from './lib/cron';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/capex', capexRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/entry-exit', entryExitRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message, err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Numero Uno PG backend running on port ${PORT}`);
  // Start background cron jobs
  startCronJobs();
});

export default app;
