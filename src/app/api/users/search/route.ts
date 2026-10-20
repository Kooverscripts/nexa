import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta para procurar pessoas.", 401);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 40) return NextResponse.json({ users: [] });
  const isAccountNumber = /^\d{4}-\d{4}$/.test(query);
  const normalized = query.replace(/^@/, "").toLowerCase();
  let requestQuery = supabaseAdmin.from("nexa_users")
    .select("id, username, account_number, display_name, bio, avatar_url")
    .neq("id", userId).eq("is_disabled", false).limit(10);
  requestQuery = isAccountNumber
    ? requestQuery.eq("account_number", query)
    : requestQuery.ilike("username", normalized.replace(/[%,()]/g, ""));
  const { data, error } = await requestQuery;
  if (error) return jsonError("Não foi possível pesquisar agora.", 500);
  return NextResponse.json({ users: data ?? [] });
}
