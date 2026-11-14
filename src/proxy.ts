import { NextResponse } from "next/server";

// This file is for lightweight redirects only. Real authorization checks belong
// in each feature's server-side queries and actions.
// Add a `request: NextRequest` parameter when a redirect needs it.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals, image optimization, and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
