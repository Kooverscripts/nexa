import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession } from "@/lib/session";
import { checkOrigin, jsonError } from "@/lib/http";

export const runtime = "nodejs";

function randomAccountNumber() {
  const digits = Array.from({ length: 8 }, () => randomInt(0, 10)).join("");
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const { username, password } = parsed.data;
  // Advisory pre-check improves UX; database unique constraints are the actual guarantee.
  const { data: existing } = await supabaseAdmin.from("nexa_users")
    .select("id").eq("username", username).maybeSingle();
  if (existing) return jsonError("Esse username já está em uso.", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  // Unique constraint handles concurrent username/number collisions.
  for (let attempt = 0; attempt < 8; attempt++) {
    const accountNumber = randomAccountNumber();
    const { data, error } = await supabaseAdmin.from("nexa_users").insert({
      username, account_number: accountNumber, password_hash: passwordHash,
      display_name: username
    }).select("id, username, account_number, display_name, bio, created_at").single();

    if (!error && data) {
      await createSession(data.id);
      return NextResponse.json({ user: data }, { status: 201 });
    }
    if (error?.code === "23505") {
      if (error.message.toLowerCase().includes("username")) return jsonError("Esse username já está em uso.", 409);
      continue;
    }
    console.error("Registration database error", error?.code);
    return jsonError("Não foi possível criar a conta agora.", 500);
  }
  return jsonError("Não foi possível gerar um número exclusivo. Tente novamente.", 503);
}