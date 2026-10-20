import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "nexa_session";
const secretText = process.env.SESSION_SECRET;
if (!secretText || Buffer.byteLength(secretText) < 32) {
  throw new Error("SESSION_SECRET must be set to at least 32 bytes.");
}
const secret = new TextEncoder().encode(secretText);
const maxAge = 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId, purpose: "nexa-session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.purpose !== "nexa-session" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch { return null; }
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 0 });
}