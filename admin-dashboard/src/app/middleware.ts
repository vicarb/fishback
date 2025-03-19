import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value; // Get token from cookies

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Validate token with Go Auth Service
    const authRes = await fetch("http://localhost:8084/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!authRes.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = await authRes.json();
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url)); // Redirect non-admins
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Apply this middleware to all admin routes
export const config = {
  matcher: ["/admin/:path*"], // ✅ Protects all /admin/* routes
};