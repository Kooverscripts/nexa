import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkOrigin, jsonError } from "@/lib/http";

type Context = { params: Promise<{ conversationId: string }> };
async function isMember(conversationId: string, userId: string) {
  const { data, error } = await supabaseAdmin.from("nexa_conversation_members").select("conversation_id")
    .eq("conversation_id", conversationId).eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}
export async function GET(request: Request, context: Context) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const { conversationId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return jsonError("Conversa inválida.", 400);
  if (!await isMember(conversationId, userId)) return jsonError("Conversa não encontrada.", 404);
  const params = new URL(request.url).searchParams;
  const before = params.get("before");
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 50) || 50));
  let query = supabaseAdmin.from("nexa_messages").select("id,conversation_id,sender_id,body,created_at,edited_at")
    .eq("conversation_id", conversationId).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) return jsonError("Não foi possível carregar as mensagens.", 500);
  await supabaseAdmin.from("nexa_conversation_members").update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId).eq("user_id", userId);
  return NextResponse.json({ messages: (data ?? []).reverse() });
}

const messageSchema = z.object({ body: z.string().trim().min(1, "Escreva uma mensagem.").max(4000, "A mensagem é muito longa.") });
export async function POST(request: Request, context: Context) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const { conversationId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return jsonError("Conversa inválida.", 400);
  if (!await isMember(conversationId, userId)) return jsonError("Conversa não encontrada.", 404);
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Mensagem inválida.");
  const { data, error } = await supabaseAdmin.from("nexa_messages").insert({
    conversation_id: conversationId, sender_id: userId, body: parsed.data.body
  }).select("id,conversation_id,sender_id,body,created_at,edited_at").single();
  if (error || !data) return jsonError("Não foi possível enviar a mensagem.", 500);
  return NextResponse.json({ message: data }, { status: 201 });
}
