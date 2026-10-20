"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Plus, RefreshCw, UsersRound } from "lucide-react";

type Person = { id: string; username: string; display_name: string; account_number: string; avatar_url?: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string };
type Conversation = { id: string; kind: "direct" | "group"; title: string | null; members: Person[]; latestMessage: Message | null };

export function ConversationsPanel({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) {
        setConversations(result.conversations ?? []);
        setActive((old) => old ? (result.conversations ?? []).find((c: Conversation) => c.id === old.id) ?? old : null);
      }
    } catch { /* Keep the last loaded state during temporary connection failures. */ }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 7000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    if (!active) { setMessages([]); return; }
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/conversations/${active.id}/messages?limit=75`, { cache: "no-store" });
        const result = await response.json();
        if (alive && response.ok) setMessages(result.messages ?? []);
      } catch { /* Poll again on the next cycle. */ }
    };
    void load(); const timer = window.setInterval(() => void load(), 3500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [active?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, active?.id]);

  async function findPeople(e: FormEvent) {
    e.preventDefault(); setStatus(""); setPeople([]);
    if (search.trim().length < 3) { setStatus("Digite pelo menos 3 caracteres."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setStatus(result.error ?? "Pesquisa indisponível.");
      else if (!result.users.length) setStatus("Nenhuma pessoa encontrada. É preciso ser amigo para iniciar uma conversa.");
      setPeople(result.users ?? []);
    } catch { setStatus("Falha de conexão."); }
    finally { setBusy(false); }
  }
  async function openConversation(person: Person) {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: person.id }) });
      const result = await response.json();
      if (!response.ok) { setStatus(result.error ?? "Não foi possível abrir a conversa."); return; }
      await refresh();
      const existing = conversations.find((c) => c.id === result.conversationId);
      if (existing) setActive(existing);
      else {
        const personConversation: Conversation = { id: result.conversationId, kind: "direct", title: null, members: [person], latestMessage: null };
        setActive(personConversation);
      }
      setPeople([]); setSearch("");
    } catch { setStatus("Falha de conexão."); }
    finally { setBusy(false); }
  }
  async function sendMessage(e: FormEvent) {
    e.preventDefault(); if (!active || !draft.trim() || busy) return;
    const body = draft.trim(); setDraft(""); setBusy(true); setStatus("");
    try {
      const response = await fetch(`/api/conversations/${active.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const result = await response.json();
      if (!response.ok) { setDraft(body); setStatus(result.error ?? "Não foi possível enviar a mensagem."); return; }
      setMessages((old) => old.some((message) => message.id === result.message.id) ? old : [...old, result.message]);
      await refresh();
    } catch { setDraft(body); setStatus("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  function titleFor(conversation: Conversation) {
    return conversation.title || conversation.members.map((p) => p.display_name).join(", ") || "Conversa";
  }

  return <section className="conversations-panel" id="conversations">
    <div className="section-title"><div><h2>Conversas</h2><p>Mensagens privadas com seus amigos. Atualização automática enquanto a tela está aberta.</p></div><span className="saved-badge"><MessageCircle size={14}/>{conversations.length} conversas</span></div>
    <form className="friend-search" onSubmit={findPeople}><SearchIcon/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Encontrar um amigo pelo username ou número" maxLength={40}/><button className="primary-button" disabled={busy}><Plus size={16}/> Nova conversa</button></form>
    {status && <p className="inline-status" role="status">{status}</p>}
    {people.length > 0 && <div className="conversation-person-results">{people.map((person) => <button key={person.id} className="conversation-person" onClick={() => void openConversation(person)} disabled={busy}><span className="friend-avatar">{person.display_name.slice(0,1).toUpperCase()}</span><span><b>{person.display_name}</b><small>@{person.username}</small></span><MessageCircle size={17}/></button>)}</div>}
    <div className="chat-layout">
      <div className="conversation-list"><div className="chat-list-heading"><UsersRound size={15}/> Suas conversas <button onClick={() => void refresh()} aria-label="Atualizar conversas"><RefreshCw size={14}/></button></div>
        {conversations.length ? conversations.map((conversation) => <button className={`conversation-item ${active?.id === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => setActive(conversation)}><span className="friend-avatar">{titleFor(conversation).slice(0,1).toUpperCase()}</span><span className="conversation-item-copy"><b>{titleFor(conversation)}</b><small>{conversation.latestMessage?.body ?? "Comece a conversar"}</small></span></button>) : <p className="empty-friends">Nenhuma conversa ainda. Encontre um amigo acima para começar.</p>}
      </div>
      <div className="chat-window">
        {active ? <><div className="chat-heading"><span className="friend-avatar">{titleFor(active).slice(0,1).toUpperCase()}</span><div><b>{titleFor(active)}</b><small>Mensagens privadas</small></div></div><div className="chat-messages">{messages.length ? messages.map((message) => <div className={`chat-bubble ${message.sender_id === currentUserId ? "mine" : "theirs"}`} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div>) : <div className="chat-empty"><MessageCircle size={26}/><b>Essa conversa é nova</b><span>Envie a primeira mensagem.</span></div>}<div ref={bottomRef}/></div><form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva uma mensagem…" maxLength={4000}/><button className="primary-button" disabled={busy || !draft.trim()} aria-label="Enviar mensagem"><ArrowUp size={18}/></button></form></> : <div className="chat-empty choose-chat"><MessageCircle size={32}/><b>Suas conversas ficam aqui</b><span>Selecione uma conversa ou encontre um amigo para começar.</span></div>}
      </div>
    </div>
  </section>;
}
function SearchIcon() { return <MessageCircle size={18}/>; }
