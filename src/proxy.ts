import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Redirects only. The real check is getCurrentUser() in every page and action
// (features/auth/queries.ts); this just sends people the right way sooner, with a real 307.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Signed in already? Then opening /login (even typed into the address bar) goes to the
  // dashboard. Only for page loads (GET): the login form's own POST must reach the page.
  if (pathname === "/login") {
    if (request.method === "GET" && getSessionCookie(request) && (await hasActiveSession(request))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // No session cookie at all: straight to /login. A cookie that exists but is stale gets
  // through here and is caught by getCurrentUser(), so this never needs the database.
  if (!pathname.startsWith("/api/") && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

/**
 * Asks the auth server whether the cookie is a live session, instead of trusting that it
 * exists: a stale cookie would otherwise bounce forever between /login and /dashboard.
 * This is the one proxy path that reaches the database, and only on /login with a cookie.
 */
async function hasActiveSession(request: NextRequest) {
  try {
    const res = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const session: { user?: { active?: boolean } } | null = res.ok ? await res.json() : null;
    return session?.user?.active === true;
  } catch {
    // Can't reach the auth server: show the login page rather than break it.
    return false;
  }
}

export const config = {
  // Skip Next.js internals, image optimization, and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
