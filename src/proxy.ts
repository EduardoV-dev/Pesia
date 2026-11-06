import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_ROUTES = ["/home", "/onboarding"]
const SESSION_COOKIE_NAMES = [
  "weight-tracker.session_token",
  "__Secure-weight-tracker.session_token",
]

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((cookieName) => request.cookies.has(cookieName))
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isProtectedRoute && !hasSessionCookie(request)) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirectTo", pathname)

    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png$).*)"],
}
