import { NextResponse } from 'next/server';
export function proxy(req) {
  if (!req.cookies.get('session')) return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/dashboard/:path*', '/platform/:path*'] };
