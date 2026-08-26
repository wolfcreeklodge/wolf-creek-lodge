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

const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:8082/auth/callback';

// ---------------------------------------------------------------------------
// MSAL deliberately does NOT expose refresh tokens on the AuthenticationResult:
// result.refreshToken is always undefined. The old code read it anyway, so
// email_sync_state.refresh_token was never populated and scripts/sync-email.mjs
// sat there logging "No refresh token found" forever, while access_token was
// written successfully -- which is exactly the state the database was found in.
//
// The supported way to reach it is the token cache, which serialize() exposes
// as { RefreshToken: { <key>: { secret, home_account_id, ... } } }. The cache is
// per client instance and getMsalClient() makes a fresh one per request, so the
// only entry present is the one just acquired.
// ---------------------------------------------------------------------------
function extractRefreshToken(msalClient, homeAccountId) {
  try {
    const cache = JSON.parse(msalClient.getTokenCache().serialize());
    const entries = Object.values(cache.RefreshToken || {});
    if (entries.length === 0) return null;
    const match = homeAccountId
      ? entries.find((e) => e.home_account_id === homeAccountId)
      : null;
    return (match || entries[0]).secret || null;
  } catch (err) {
    console.error('Could not read refresh token from MSAL cache:', err.message);
    return null;
  }
}
const ALLOWED_EMAILS = (process.env.CRM_ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';

// A "secure" cookie is never sent over plain HTTP. Keying this off NODE_ENV
// meant that running production behind http://localhost (which is how this
// admin-only CRM is reached now that the crm.wolfcreeklodge.us tunnel route is
// gone) set a cookie the browser silently refused to store, so the session was
// lost between the OAuth callback and the next request and login just looped.
// Follow the redirect URI's scheme instead, which is the thing that actually
// determines whether the browser will keep it.
const USE_SECURE_COOKIE = (process.env.MICROSOFT_REDIRECT_URI || '').startsWith('https://');

export function setupAuth(app) {
  // Trust proxy (Cloudflare terminates SSL, forwards HTTP)
  app.set('trust proxy', 1);

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
      secure: USE_SECURE_COOKIE,
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
        scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read', 'offline_access'],
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
        scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read', 'offline_access'],
        redirectUri: REDIRECT_URI,
      });

      const email = (result.account?.username || result.idTokenClaims?.preferred_username || '').toLowerCase();
      const name = result.account?.name || result.idTokenClaims?.name || email;

      // Check allowed emails
      // Fail closed: an unset allowlist must mean nobody, not everybody. The app
      // registration accepts personal Microsoft accounts, so with authority 'common'
      // any Microsoft account at all can reach this callback.
      if (ALLOWED_EMAILS.length === 0 || !ALLOWED_EMAILS.includes(email)) {
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

      // Persist Graph API tokens so scripts/sync-email.mjs can run unattended.
      if (result.accessToken) {
        const refreshToken = extractRefreshToken(
          msalClient,
          result.account?.homeAccountId
        );
        try {
          await pool.query(`
            UPDATE email_sync_state SET
              access_token = $1,
              refresh_token = COALESCE($2, refresh_token),
              token_expires_at = $3,
              updated_at = now()
            WHERE id = 1
          `, [
            result.accessToken,
            refreshToken,
            result.expiresOn || null,
          ]);
          if (refreshToken) {
            console.log(`Stored Graph access + refresh token for ${email}`);
          } else {
            console.warn(
              `Stored Graph access token for ${email}, but NO refresh token was ` +
              `in the MSAL cache. Email sync will stop working when this access ` +
              `token expires. Check that 'offline_access' is in the consented ` +
              `scopes for this app registration.`
            );
          }
        } catch (tokenErr) {
          console.error('Failed to store Graph API tokens:', tokenErr.message);
        }
      }

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
