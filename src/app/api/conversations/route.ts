import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkOrigin, jsonError } from "@/lib/http";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const { data: memberships, error: membershipError } = await supabaseAdmin.from("nexa_conversation_members")
    .select("conversation_id,last_read_at").eq("user_id", userId);
  if (membershipError) return jsonError("Não foi possível carregar as conversas.", 500);
  const ids = (memberships ?? []).map((row) => row.conversation_id);
  if (!ids.length) return NextResponse.json({ conversations: [] });
  const { data: conversations, error } = await supabaseAdmin.from("nexa_conversations")
    .select("id,kind,title,created_by,created_at").in("id", ids).order("created_at", { ascending: false });
  if (error) return jsonError("Não foi possível carregar as conversas.", 500);
  const result = await Promise.all((conversations ?? []).map(async (conversation) => {
    const [{ data: members }, { data: latest }] = await Promise.all([
      supabaseAdmin.from("nexa_conversation_members").select("user_id").eq("conversation_id", conversation.id),
      supabaseAdmin.from("nexa_messages").select("id,body,sender_id,created_at").eq("conversation_id", conversation.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1)
    ]);
    const otherIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== userId);
    const { data: people } = otherIds.length ? await supabaseAdmin.from("nexa_users").select("id,username,display_name,account_number,avatar_url").in("id", otherIds) : { data: [] };
    const member = memberships?.find((m) => m.conversation_id === conversation.id);
    return { ...conversation, members: people ?? [], lastReadAt: member?.last_read_at ?? null, latestMessage: latest?.[0] ?? null };
  }));
  return NextResponse.json({ conversations: result });
}

const createSchema = z.object({ targetId: z.string().uuid() });
export async function POST(request: Request) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || parsed.data.targetId === userId) return jsonError("Pessoa inválida.");
  const targetId = parsed.data.targetId;
  const [userA, userB] = [userId, targetId].sort();
  const { data: friendship, error: friendError } = await supabaseAdmin.from("nexa_friendships").select("id")
    .eq("user_a", userA).eq("user_b", userB).maybeSingle();
  if (friendError) return jsonError("Não foi possível verificar a amizade.", 500);
  if (!friendship) return jsonError("Vocês precisam ser amigos para iniciar uma conversa.", 403);
  const directKey = `${userA}:${userB}`;
  const { data: existing, error: existingError } = await supabaseAdmin.from("nexa_conversations").select("id")
    .eq("direct_key", directKey).maybeSingle();
  if (existingError) return jsonError("Não foi possível abrir a conversa.", 500);
  if (existing) return NextResponse.json({ conversationId: existing.id });
  const { data: conversation, error: createError } = await supabaseAdmin.from("nexa_conversations")
    .insert({ kind: "direct", direct_key: directKey, created_by: userId }).select("id").single();
  if (createError) {
    // A concurrent request may have created the same direct conversation.
    const { data: concurrent } = await supabaseAdmin.from("nexa_conversations").select("id").eq("direct_key", directKey).maybeSingle();
    if (concurrent) return NextResponse.json({ conversationId: concurrent.id });
    return jsonError("Não foi possível criar a conversa.", 500);
  }
  const { error: memberError } = await supabaseAdmin.from("nexa_conversation_members").insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: targetId }
  ]);
  if (memberError) {
    await supabaseAdmin.from("nexa_conversations").delete().eq("id", conversation.id);
    return jsonError("Não foi possível preparar a conversa.", 500);
  }
  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
