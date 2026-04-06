import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { ConfidentialClientApplication } from '@azure/msal-node';
import pool from './db.js';

const PgStore = pgSession(session);

// MSAL configuration
function getMsalClient() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) return null;

  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const ALLOWED_EMAILS = (process.env.CRM_ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';
const IS_DEV = process.env.NODE_ENV !== 'production';

export function setupAuth(app) {
  // Session middleware using PostgreSQL store
  app.use(session({
    store: new PgStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: false,
    }),
    secret: process.env.CRM_SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !IS_DEV,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Dev bypass: auto-login
  if (DEV_BYPASS) {
    app.use((req, _res, next) => {
      if (!req.session.user) {
        req.session.user = { email: 'dev@wolfcreeklodge.us', name: 'Dev User' };
      }
      next();
    });
  }

  // Auth routes
  app.get('/auth/login', async (req, res) => {
    if (DEV_BYPASS) {
      return res.redirect('/');
    }

    const msalClient = getMsalClient();
    if (!msalClient) {
      return res.status(500).json({ error: 'OAuth not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.' });
    }

    try {
      const authUrl = await msalClient.getAuthCodeUrl({
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: REDIRECT_URI,
      });
      res.redirect(authUrl);
    } catch (err) {
      console.error('Auth login error:', err);
      res.status(500).json({ error: 'Failed to initiate login' });
    }
  });

  app.get('/auth/callback', async (req, res) => {
    if (DEV_BYPASS) {
      return res.redirect('/');
    }

    const msalClient = getMsalClient();
    if (!msalClient) {
      return res.status(500).json({ error: 'OAuth not configured' });
    }

    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
      const result = await msalClient.acquireTokenByCode({
        code,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: REDIRECT_URI,
      });

      const email = (result.account?.username || result.idTokenClaims?.preferred_username || '').toLowerCase();
      const name = result.account?.name || result.idTokenClaims?.name || email;

      // Check allowed emails
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6;">
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h1 style="color: #dc2626;">Access Denied</h1>
              <p>The email <strong>${email}</strong> is not authorized to access this CRM.</p>
              <p>Please contact the administrator if you believe this is an error.</p>
              <a href="/auth/login" style="color: #2563eb;">Try a different account</a>
            </div>
          </body>
          </html>
        `);
      }

      req.session.user = { email, name };
      res.redirect('/');
    } catch (err) {
      console.error('Auth callback error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });

  app.get('/auth/me', (req, res) => {
    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }
    res.status(401).json({ user: null });
  });
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}
