import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { serialize } from 'cookie';
import type { NextApiResponse, NextApiRequest } from 'next';
import prisma from '@/lib/prismadb';
import { Role } from '@/generated/prisma';
import { failureResp, successResp } from './apiResponse';

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
  type?: 'access' | 'refresh' | 'cookie';
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

export async function getCurrentUser(req: NextApiRequest) {
  const token = readAuthCookie(req);
  if (!token) return failureResp('user', undefined, 'Unauthorized');

  const payload = await verifySession(token);
  const userId = payload.sub;
  if (!userId) return failureResp('user', undefined, 'Invalid session');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });
  if (!user) return failureResp('user', undefined, 'User not found');
  return successResp('user', user);
}

export async function getCurrentUserId(req: NextApiRequest) {
  const token = readAuthCookie(req);
  if (!token) return failureResp('userId', undefined, 'Unauthorized');

  const payload = await verifySession(token);
  const userId = payload.sub;
  if (!userId) return failureResp('userId', undefined, 'Invalid Session');

  return successResp('userId', userId);
}

export function hasRole(user: { role: Role }, requiredRole: Role) {
  const userRole = user.role;
  const hierarchy = {
    EMPLOYEE: 0,
    MANAGER: 1,
    ADMIN: 2,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

export async function authGuard<U extends { role: Role }>(
  req: NextApiRequest,
  requiredRole: Role,
  usr?: U
) {
  if (usr) {
    if (!hasRole(usr, requiredRole))
      return failureResp('user', usr, 'Not Authorized');

    return successResp('user', usr);
  } else {
    const { ok, user, error } = await getCurrentUser(req);
    if (!ok) return failureResp('user', undefined, error);

    if (!hasRole(user, requiredRole))
      return failureResp('user', user, 'Not Authorized');

    return successResp('user', user);
  }
}
