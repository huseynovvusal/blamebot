import { NextResponse, type NextRequest } from "next/server"

/**
 * Demo mode middleware.
 *
 * All routes are public - no authentication required.
 * This allows anyone to access the panel for demo purposes.
 */
export async function middleware(req: NextRequest) {
  // Demo mode: allow all requests through without authentication
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
