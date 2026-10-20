import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { checkOrigin, jsonError } from "@/lib/http";
export async function POST(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  await destroySession();
  return NextResponse.json({ ok: true });
}