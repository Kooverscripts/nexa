import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  // Non-browser clients may omit Origin; cookie-authenticated mutations should be same-site.
  if (!origin) return true;
  if (expected) return origin === expected;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}