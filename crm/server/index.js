import express from 'express';
import helmet from 'helmet';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { setupAuth, requireAuth } from './auth.js';
import guestsRouter from './routes/guests.js';
import reservationsRouter from './routes/reservations.js';
import paymentsRouter from './routes/payments.js';
import dashboardRouter from './routes/dashboard.js';
import importRouter from './routes/import.js';
import exportRouter from './routes/export.js';
import activityRouter from './routes/activity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for SPA compatibility
}));

// Parse JSON bodies (10mb limit for imports)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup auth (sessions + routes under /crm/auth)
setupAuth(app);

// Serve static files at /crm path (matches Vite base: '/crm/')
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use('/crm', express.static(distPath));
}

// API routes under /crm/api (all require auth)
app.use('/crm/api/guests', requireAuth, guestsRouter);
app.use('/crm/api/reservations', requireAuth, reservationsRouter);
app.use('/crm/api', requireAuth, paymentsRouter);
app.use('/crm/api/dashboard', requireAuth, dashboardRouter);
app.use('/crm/api/import', requireAuth, importRouter);
app.use('/crm/api/export', requireAuth, exportRouter);
app.use('/crm/api/activity', requireAuth, activityRouter);

// Redirect bare /crm to /crm/
app.get('/crm', (req, res) => res.redirect('/crm/'));

// SPA fallback: any /crm/* GET request serves index.html
app.get('/crm/*', (req, res) => {
  if (req.path.startsWith('/crm/api/') || req.path.startsWith('/crm/auth/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h1>Wolf Creek Lodge CRM</h1>
          <p>Backend is running. Build the frontend with <code>npm run build</code>.</p>
          <p><a href="/crm/auth/me">Check auth status</a> | <a href="/crm/api/dashboard">Dashboard API</a></p>
        </div>
      </body></html>
    `);
  }
});

// Redirect root to /crm/
app.get('/', (req, res) => res.redirect('/crm/'));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Wolf Creek Lodge CRM server running on port ${PORT}`);
  console.log(`  Base path: /crm`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Auth bypass: ${process.env.DEV_BYPASS_AUTH === 'true' ? 'ENABLED' : 'disabled'}`);
  console.log(`  Database: PostgreSQL via DATABASE_URL`);
});

export default app;
