import { NextResponse } from 'next/server';
import {
  getSession, getMsalClient, ALLOWED_EMAILS, REDIRECT_URI, DEV_BYPASS,
  isAllowedEmail, extractRefreshToken,
} from '../../../../lib/auth.js';
import pool from '../../../../lib/db.js';

// Use the public origin for redirects, not the internal Docker hostname
const PUBLIC_ORIGIN = process.env.WEBSITE_REDIRECT_URI
  ? new URL(process.env.WEBSITE_REDIRECT_URI).origin
  : 'https://wolfcreeklodge.us';

export async function GET(request, { params }) {
  const { action } = await params;

  if (action === 'login') {
    const session = await getSession();

    if (DEV_BYPASS) {
      session.user = { email: 'dev@wolfcreeklodge.us', name: 'Dev User' };
      await session.save();
      return NextResponse.redirect(`${PUBLIC_ORIGIN}/availability`);
    }

    const msalClient = getMsalClient();
    if (!msalClient) {
      return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 });
    }

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read', 'offline_access'],
      redirectUri: REDIRECT_URI,
    });
    return NextResponse.redirect(authUrl);
  }

  if (action === 'callback') {
    if (DEV_BYPASS) {
      const session = await getSession();
      session.user = { email: 'dev@wolfcreeklodge.us', name: 'Dev User' };
      await session.save();
      return NextResponse.redirect(`${PUBLIC_ORIGIN}/availability`);
    }

    const msalClient = getMsalClient();
    if (!msalClient) {
      return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    try {
      const result = await msalClient.acquireTokenByCode({
        code,
        scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read', 'offline_access'],
        redirectUri: REDIRECT_URI,
      });

      const email = (result.account?.username || result.idTokenClaims?.preferred_username || '').toLowerCase();
      const name = result.account?.name || result.idTokenClaims?.name || email;

      if (!isAllowedEmail(email)) {
        return new Response(`Access denied for ${email}`, { status: 403 });
      }

      const session = await getSession();
      session.user = { email, name };
      await session.save();

      // Persist Graph tokens so scripts/sync-email.mjs can run unattended.
      // This admin sign-in is the practical way to seed them: its redirect URI
      // is the one already registered on the app.
      if (result.accessToken) {
        const refreshToken = extractRefreshToken(msalClient, result.account?.homeAccountId);
        try {
          await pool.query(`
            UPDATE email_sync_state SET
              access_token = $1,
              refresh_token = COALESCE($2, refresh_token),
              token_expires_at = $3,
              updated_at = now()
            WHERE id = 1
          `, [result.accessToken, refreshToken, result.expiresOn || null]);
          console.log(
            refreshToken
              ? `Stored Graph access + refresh token for ${email}`
              : `Stored Graph access token for ${email}, but no refresh token was in ` +
                `the MSAL cache -- check that offline_access is a consented scope.`
          );
        } catch (e) {
          console.error('Failed to store Graph API tokens:', e.message);
        }
      }

      return NextResponse.redirect(`${PUBLIC_ORIGIN}/availability`);
    } catch (err) {
      console.error('Auth callback error:', err);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
  }

  if (action === 'me') {
    const session = await getSession();
    return NextResponse.json({ user: session.user || null });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request, { params }) {
  const { action } = await params;

  if (action === 'logout') {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
