import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkOrigin, jsonError } from "@/lib/http";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const [{ data: incoming, error: incomingError }, { data: outgoing, error: outgoingError }, { data: edges, error: edgesError }] = await Promise.all([
    supabaseAdmin.from("nexa_friend_requests").select("id, sender_id, receiver_id, status, created_at, sender:nexa_users!nexa_friend_requests_sender_id_fkey(id, username, account_number, display_name, avatar_url)").eq("receiver_id", userId).eq("status", "pending").order("created_at", { ascending: false }),
    supabaseAdmin.from("nexa_friend_requests").select("id, sender_id, receiver_id, status, created_at, receiver:nexa_users!nexa_friend_requests_receiver_id_fkey(id, username, account_number, display_name, avatar_url)").eq("sender_id", userId).eq("status", "pending").order("created_at", { ascending: false }),
    supabaseAdmin.from("nexa_friendships").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`)
  ]);
  if (incomingError || outgoingError || edgesError) return jsonError("Não foi possível carregar seus amigos.", 500);
  const friendIds = (edges ?? []).map((edge) => edge.user_a === userId ? edge.user_b : edge.user_a);
  let friends: unknown[] = [];
  if (friendIds.length) {
    const { data, error } = await supabaseAdmin.from("nexa_users").select("id, username, account_number, display_name, bio, avatar_url").in("id", friendIds).order("display_name");
    if (error) return jsonError("Não foi possível carregar seus amigos.", 500);
    friends = data ?? [];
  }
  return NextResponse.json({ incoming: incoming ?? [], outgoing: outgoing ?? [], friends });
}

const sendSchema = z.object({ targetId: z.string().uuid() });
export async function POST(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return jsonError("Pessoa inválida.");
  const targetId = parsed.data.targetId;
  if (targetId === userId) return jsonError("Você não pode adicionar a si mesmo.");
  const [target, existingFriendship, forward, reverse] = await Promise.all([
    supabaseAdmin.from("nexa_users").select("id").eq("id", targetId).eq("is_disabled", false).maybeSingle(),
    supabaseAdmin.from("nexa_friendships").select("id").or(`and(user_a.eq.${userId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${userId})`).maybeSingle(),
    supabaseAdmin.from("nexa_friend_requests").select("id,status").eq("sender_id", userId).eq("receiver_id", targetId).maybeSingle(),
    supabaseAdmin.from("nexa_friend_requests").select("id,status").eq("sender_id", targetId).eq("receiver_id", userId).maybeSingle()
  ]);
  if (!target.data) return jsonError("Essa conta não foi encontrada.", 404);
  if (existingFriendship.data) return jsonError("Vocês já são amigos.", 409);
  if (reverse.data?.status === "pending") return jsonError("Essa pessoa já enviou uma solicitação para você. Aceite-a na lista de recebidas.", 409);
  if (forward.data?.status === "pending") return jsonError("A solicitação já foi enviada.", 409);
  if (forward.data) {
    const { error } = await supabaseAdmin.from("nexa_friend_requests").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", forward.data.id);
    if (error) return jsonError("Não foi possível enviar a solicitação.", 500);
  } else {
    const { error } = await supabaseAdmin.from("nexa_friend_requests").insert({ sender_id: userId, receiver_id: targetId, status: "pending" });
    if (error) return jsonError("Não foi possível enviar a solicitação.", 500);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
