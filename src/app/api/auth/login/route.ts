import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession } from "@/lib/session";
import { checkOrigin, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError("Username ou senha inválidos.", 400);

  const { data: user } = await supabaseAdmin.from("nexa_users")
    .select("id, username, account_number, display_name, bio, password_hash, created_at, is_disabled")
    .eq("username", parsed.data.username).maybeSingle();

  // A fixed-cost comparison for unknown usernames reduces timing differences.
  const hash = user?.password_hash ?? "$2a$12$C6UzMDM.H6dfI/f/IKcEe.5g8dWbYy1K8F4pL0yH8j5q4n4b7xw1K";
  const valid = await bcrypt.compare(parsed.data.password, hash).catch(() => false);
  if (!user || !valid || user.is_disabled) return jsonError("Username ou senha inválidos.", 401);

  await createSession(user.id);
  const { password_hash: _secret, is_disabled: _disabled, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}