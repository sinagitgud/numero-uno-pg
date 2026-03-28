import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge runtime — NO Firebase imports, NO Zustand imports.
// Reads auth-token and user-role cookies only.

const PUBLIC_PATHS = ['/login'];

// Routes only staff roles can access
const STAFF_PATHS = [
  '/dashboard', '/tenants', '/rent', '/tickets',
  '/expenses', '/staff', '/properties', '/guests', '/leaves', '/inquiries',
];

// Routes only tenants can access
const TENANT_PATHS = ['/tenant', '/my'];

// Legacy /my/* → /tenant/* redirect map
const MY_REDIRECT_MAP: Record<string, string> = {
  '/my/home':    '/tenant',
  '/my/rent':    '/tenant/rent',
  '/my/tickets': '/tenant/support',
  '/my/guests':  '/tenant/guests',
  '/my/leave':   '/tenant/leave',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /my/* → /tenant/*
  if (pathname.startsWith('/my')) {
    const dest = MY_REDIRECT_MAP[pathname] ?? `/tenant${pathname.slice(3) || ''}`;
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  const role = request.cookies.get('user-role')?.value;

  // Not logged in — send to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isTenant = role === 'TENANT';
  const isStaffRoute = STAFF_PATHS.some((p) => pathname.startsWith(p));
  const isTenantRoute = TENANT_PATHS.some((p) => pathname.startsWith(p));

  // Tenant trying to access a staff route
  if (isTenant && isStaffRoute) {
    return NextResponse.redirect(new URL('/tenant', request.url));
  }

  // Staff/Owner trying to access a tenant route
  if (!isTenant && isTenantRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
