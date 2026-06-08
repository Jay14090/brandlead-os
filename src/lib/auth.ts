import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'brandlead_session';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.APP_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or APP_ENCRYPTION_SECRET must be set');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(username: string, userId: string, role: string): Promise<string> {
  const token = await new SignJWT({ username, userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecret());

  return token;
}

export async function verifySession(token: string): Promise<{ username: string; userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { 
      username: payload.username as string,
      userId: payload.userId as string,
      role: payload.role as string
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ username: string; userId: string; role: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  return verifySession(sessionCookie.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Middleware helper for API routes - verifies the session token
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  return null; // null means authenticated
}
