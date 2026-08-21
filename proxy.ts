import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userToken = request.cookies.get('auth_token')?.value;

  if (pathname === '/user-dashboard' && !userToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const authPages = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/otp',
    '/auth/reset-password',
  ];

  if (authPages.includes(pathname) && userToken) {
    return NextResponse.redirect(new URL('/user-dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/user-dashboard',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/otp',
    '/auth/reset-password',
  ],
};
