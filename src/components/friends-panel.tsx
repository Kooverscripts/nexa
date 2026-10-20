"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Search, UserPlus, UsersRound, X } from "lucide-react";

type Person = { id: string; username: string; account_number: string; display_name: string; bio?: string; avatar_url?: string | null };
type Incoming = { id: string; sender: Person };
type Outgoing = { id: string; receiver: Person };
type FriendData = { incoming: Incoming[]; outgoing: Outgoing[]; friends: Person[] };

export function FriendsPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [data, setData] = useState<FriendData>({ incoming: [], outgoing: [], friends: [] });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/friends", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setData(result);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function search(e: React.FormEvent) {
    e.preventDefault(); setStatus(""); setResults([]);
    if (query.trim().length < 3) { setStatus("Digite pelo menos 3 caracteres ou o número NEXA completo."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setStatus(result.error ?? "Não foi possível pesquisar."); else if (!result.users.length) setStatus("Nenhuma pessoa encontrada.");
      setResults(result.users ?? []);
    } catch { setStatus("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function send(targetId: string) {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId }) });
      const result = await response.json();
      if (!response.ok) setStatus(result.error ?? "Não foi possível enviar.");
      else { setStatus("Solicitação enviada!"); setResults((old) => old.filter((person) => person.id !== targetId)); await refresh(); }
    } catch { setStatus("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function act(requestId: string, action: "accept" | "decline" | "cancel") {
    setBusy(true); setStatus("");
    try {
      const response = await fetch(`/api/friends/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) setStatus(result.error ?? "Não foi possível atualizar.");
      await refresh();
    } catch { setStatus("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  const personRow = (person: Person, action?: React.ReactNode) => <div className="friend-row" key={person.id}><div className="friend-avatar">{person.display_name.slice(0, 1).toUpperCase()}</div><div className="friend-copy"><b>{person.display_name}</b><span>@{person.username} · {person.account_number}</span></div>{action}</div>;

  return <section className="friends-panel" id="friends">
    <div className="section-title"><div><h2>Amigos</h2><p>Encontre pessoas pelo username ou número NEXA.</p></div><span className="saved-badge"><UsersRound size={14}/>{data.friends.length} amigos</span></div>
    <form className="friend-search" onSubmit={search}><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por username ou 1234-5678" maxLength={40}/><button className="primary-button" disabled={busy}><Search size={16}/> Buscar</button></form>
    {status && <p className={status.includes("enviada") ? "success-message" : "inline-status"} role="status">{status}</p>}
    {results.length > 0 && <div className="friend-subsection"><h3>Resultados</h3>{results.map((person) => personRow(person, <button className="icon-action" disabled={busy} onClick={() => void send(person.id)} aria-label={`Adicionar ${person.username}`} key={`add-${person.id}`}><UserPlus size={17}/></button>))}</div>}
    <div className="friends-columns">
      <div className="friend-subsection"><h3>Solicitações recebidas <span>{data.incoming.length}</span></h3>{data.incoming.length ? data.incoming.map((item) => personRow(item.sender, <div className="friend-actions" key={`actions-${item.id}`}><button className="icon-action accept-action" disabled={busy} onClick={() => void act(item.id, "accept")} aria-label="Aceitar"><Check size={17}/></button><button className="icon-action" disabled={busy} onClick={() => void act(item.id, "decline")} aria-label="Recusar"><X size={17}/></button></div>)) : <p className="empty-friends">Nenhuma solicitação recebida.</p>}</div>
      <div className="friend-subsection"><h3>Solicitações enviadas <span>{data.outgoing.length}</span></h3>{data.outgoing.length ? data.outgoing.map((item) => personRow(item.receiver, <button className="icon-action" disabled={busy} onClick={() => void act(item.id, "cancel")} aria-label="Cancelar solicitação" key={`cancel-${item.id}`}><X size={17}/></button>)) : <p className="empty-friends">Você não enviou solicitações.</p>}</div>
    </div>
    <div className="friend-subsection all-friends"><h3>Seus amigos</h3>{data.friends.length ? data.friends.map((person) => personRow(person)) : <p className="empty-friends">Sua lista está vazia. Pesquise alguém acima para começar.</p>}</div>
  </section>;
}
