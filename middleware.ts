// middleware.ts (Projekt-Root)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'os_session';
const ALG = 'HS256';
const REDIRECT_IF_NOT_AUTHENTICATED = '/auth/login';
const REDIRECT_IF_NOT_AUTHORIZED = '/';

// Pfade, die ohne Auth erreichbar sein dürfen:
const PUBLIC_PATHS = new Set<string>([
  '/auth/login', // Login
]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('ENV AUTH_SECRET fehlt');
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Öffentliche Routen durchlassen
  if (isPublicPath(pathname)) return NextResponse.next();

  // Auth-Cookie prüfen
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = new URL(REDIRECT_IF_NOT_AUTHENTICATED, req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // JWT verifizieren (Edge-kompatibel)
  let payload: any;
  try {
    const verified = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    payload = verified.payload;
  } catch {
    const url = new URL(REDIRECT_IF_NOT_AUTHENTICATED, req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Role-Gate für /management/:path*
  if (pathname.startsWith('/management')) {
    const role = payload?.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | undefined;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      // Authentifiziert, aber nicht berechtigt -> Redirect auf eine „Startseite“
      const url = new URL(REDIRECT_IF_NOT_AUTHORIZED, req.url); // ggf. anpassen
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Alle Routen außer:
    // - /api (API-Routen nicht von dieser Middleware erfasst)
    // - /_next/static, /_next/image (Next intern)
    // - /favicon.ico, /logo.png, /images/*, /fonts/* (statische Assets)
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|images|fonts).*)',
  ],
};
