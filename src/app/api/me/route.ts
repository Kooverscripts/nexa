import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { profileSchema } from "@/lib/validation";
import { checkOrigin, jsonError } from "@/lib/http";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Não autenticado.", 401);
  const { data, error } = await supabaseAdmin.from("nexa_users")
    .select("id, username, account_number, display_name, bio, avatar_url, banner_url, created_at")
    .eq("id", userId).maybeSingle();
  if (error || !data) return jsonError("Conta não encontrada.", 404);
  return NextResponse.json({ user: data });
}

export async function PATCH(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Não autenticado.", 401);
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const { data, error } = await supabaseAdmin.from("nexa_users")
    .update({ display_name: parsed.data.displayName, bio: parsed.data.bio })
    .eq("id", userId)
    .select("id, username, account_number, display_name, bio, avatar_url, banner_url, created_at")
    .single();
  if (error || !data) return jsonError("Não foi possível salvar o perfil.", 500);
  return NextResponse.json({ user: data });
}