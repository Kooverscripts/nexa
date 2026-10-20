import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkOrigin, jsonError } from "@/lib/http";

const actionSchema = z.object({ action: z.enum(["accept", "decline", "cancel"]) });
type Context = { params: Promise<{ requestId: string }> };
export async function PATCH(request: Request, context: Context) {
  if (!checkOrigin(request)) return jsonError("Origem da solicitação inválida.", 403);
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Entre na sua conta.", 401);
  const { requestId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ação inválida.");
  const { data: friendRequest, error } = await supabaseAdmin.from("nexa_friend_requests")
    .select("id,sender_id,receiver_id,status").eq("id", requestId).maybeSingle();
  if (error || !friendRequest) return jsonError("Solicitação não encontrada.", 404);
  const action = parsed.data.action;
  if (action === "cancel") {
    if (friendRequest.sender_id !== userId || friendRequest.status !== "pending") return jsonError("Você não pode cancelar essa solicitação.", 403);
    const { error: updateError } = await supabaseAdmin.from("nexa_friend_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", requestId);
    if (updateError) return jsonError("Não foi possível cancelar.", 500);
    return NextResponse.json({ ok: true });
  }
  if (friendRequest.receiver_id !== userId || friendRequest.status !== "pending") return jsonError("Essa solicitação não está disponível para você.", 403);
  const nextStatus = action === "accept" ? "accepted" : "declined";
  const { error: updateError } = await supabaseAdmin.from("nexa_friend_requests").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", requestId).eq("status", "pending");
  if (updateError) return jsonError("Não foi possível atualizar a solicitação.", 500);
  if (action === "accept") {
    const [userA, userB] = [friendRequest.sender_id, friendRequest.receiver_id].sort();
    const { error: edgeError } = await supabaseAdmin.from("nexa_friendships").upsert({ user_a: userA, user_b: userB }, { onConflict: "user_a,user_b", ignoreDuplicates: true });
    if (edgeError) return jsonError("Solicitação atualizada, mas não foi possível concluir a amizade. Tente novamente.", 500);
  }
  return NextResponse.json({ ok: true });
}
