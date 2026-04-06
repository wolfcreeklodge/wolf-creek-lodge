import { NextResponse } from 'next/server';
import { getSession, getMsalClient, ALLOWED_EMAILS, REDIRECT_URI, DEV_BYPASS } from '../../../../lib/auth.js';

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
      scopes: ['openid', 'profile', 'email', 'User.Read'],
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
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: REDIRECT_URI,
      });

      const email = (result.account?.username || result.idTokenClaims?.preferred_username || '').toLowerCase();
      const name = result.account?.name || result.idTokenClaims?.name || email;

      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
        return new Response(`Access denied for ${email}`, { status: 403 });
      }

      const session = await getSession();
      session.user = { email, name };
      await session.save();

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
