import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { serialize } from 'cookie';
import type { NextApiResponse, NextApiRequest } from 'next';

const ALG = 'HS256';
const COOKIE_NAME = 'os_session';
const ONE_DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * ONE_DAY;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('ENV AUTH_SECRET fehlt');
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string; // userId
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  name?: string;
  email?: string | null;
};

export async function signSession(
  payload: SessionPayload,
  { expiresInSec }: { expiresInSec: number }
) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: [ALG],
  });
  return payload as SessionPayload & JWTPayload;
}

export function setAuthCookie(
  res: NextApiResponse,
  token: string,
  remember: boolean
) {
  const maxAge = remember ? THIRTY_DAYS : ONE_DAY;
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    maxAge,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearAuthCookie(res: NextApiResponse) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function readAuthCookie(req: NextApiRequest) {
  const raw = req.headers.cookie || '';
  const map = Object.fromEntries(
    raw.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
    })
  );
  return map[COOKIE_NAME] || null;
}
