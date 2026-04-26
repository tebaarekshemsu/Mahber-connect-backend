import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // We can't access Zustand/localStorage directly in Edge middleware,
  // but if the JWT is stored in cookies, we'd check it here.
  // Since we are storing JWT in localStorage for now (per initial requirements),
  // true route protection happens at the component level or via a client-side layout wrapper.
  
  // However, we can still redirect away from login/register if we detect a specific cookie later.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
