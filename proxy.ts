import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server-side route guards. Next 16 uses the "proxy" file convention (the old
// "middleware" naming is deprecated), so this file is executed for every
// matched route. The `runtime: "nodejs"` config lets us verify the JWT with
// node:crypto - no extra dependency.
//
// The auth_token cookie holds the access token. When JWT_SECRET is configured
// on this app (must equal the server's JWT_SECRET), the HMAC signature is
// verified and the role claim drives admin/user branching. When it is absent,
// access degrades to the legacy presence-only check (token merely exists) so
// routing keeps working without extra config - just without role enforcement.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  if (protectedPaths.includes(pathname) && !session.authed) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (authPages.includes(pathname) && session.authed) {
    const target =
      session.role === "admin"
        ? "/dashboard/admin-dashboard"
        : "/dashboard/user-dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Only enforce the admin dashboard gate when the JWT was actually verified
  // (i.e. a secret is configured); otherwise it would lock admins out under
  // the presence-only fallback.
  if (
    process.env.JWT_SECRET &&
    pathname.startsWith("/dashboard/admin-dashboard") &&
    session.authed &&
    session.role !== "admin"
  ) {
    return NextResponse.redirect(
      new URL("/dashboard/user-dashboard", request.url)
    );
  }

  return NextResponse.next();
}

interface Session {
  authed: boolean;
  role?: string;
}

const readSession = (request: NextRequest): Session => {
  const raw = request.cookies.get("auth_token")?.value;

  if (!raw) {
    return { authed: false };
  }

  if (!process.env.JWT_SECRET) {
    // Legacy fallback: no secret configured on this app, so only presence can
    // be checked. The frontend still verifies expiry client-side.
    return { authed: true };
  }

  const decoded = verifyJwt(raw, process.env.JWT_SECRET);
  if (!decoded) {
    // Missing/invalid/expired token - treated as unauthenticated.
    return { authed: false };
  }

  return { authed: true, role: typeof decoded.role === "string" ? decoded.role : undefined };
};

interface JwtClaims {
  role?: unknown;
  exp?: unknown;
}

// Manual HS256 verification using node:crypto. jsonwebtoken is a server-side
// dependency, so this mirrors its default algorithm (HS256) here without
// adding a package to the web app.
const verifyJwt = (
  token: string,
  secret: string
): JwtClaims | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: unknown };
  let payload: JwtClaims;
  try {
    header = JSON.parse(base64UrlDecode(headerB64)) as { alg?: unknown };
    payload = JSON.parse(base64UrlDecode(payloadB64)) as JwtClaims;
  } catch {
    return null;
  }

  if (header.alg !== "HS256") {
    return null;
  }

  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureB64);
  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return null;
  }

  if (
    typeof payload.exp === "number" &&
    payload.exp * 1000 <= Date.now()
  ) {
    return null;
  }

  return payload;
};

const base64UrlDecode = (value: string): string => {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  ).toString("utf8");
};

const protectedPaths = [
  "/dashboard/user-dashboard",
  "/dashboard/admin-dashboard",
  "/blogs/create",
  "/blogs",
  "/blogs/preview",
  "/blogs/attachment-preview",
  "/faqs",
  "/faqs/create",
  "/faqs/edit",
  "/videos",
  "/videos/create",
  "/videos/preview",
  "/profile",
];

const authPages = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/otp",
  "/auth/reset-password",
];

export const config = {
  matcher: [
    "/dashboard/user-dashboard",
    "/dashboard/admin-dashboard",
    "/blogs/create",
    "/blogs",
    "/blogs/preview",
    "/blogs/attachment-preview",
    "/faqs",
    "/faqs/create",
    "/faqs/edit",
    "/videos",
    "/videos/create",
    "/videos/preview",
    "/profile",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/otp",
    "/auth/reset-password",
  ],
};