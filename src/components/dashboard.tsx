"use client";
import { useEffect, useState } from "react";
import { FriendsPanel } from "@/components/friends-panel";
import { ConversationsPanel } from "@/components/conversations-panel";
import { Bell, Check, ChevronRight, CircleUserRound, Compass, Gem, LogOut, MessageCircle, Settings, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

type User = { id:string; username:string; account_number:string; display_name:string; bio:string; created_at:string };
export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/me").then(r => r.json()).then(d => { if (d.user) {setUser(d.user);setDisplayName(d.user.display_name);setBio(d.user.bio ?? "");} }).finally(() => setLoading(false)); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setStatus("");
    const r = await fetch("/api/me", {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName,bio})});
    const d = await r.json(); if (!r.ok) return setStatus(d.error ?? "Erro ao salvar.");
    setUser(d.user); setStatus("Perfil salvo com sucesso.");
  }
  async function logout() { await fetch("/api/auth/logout",{method:"POST"}); window.location.reload(); }
  if (loading) return <main className="loading-screen">Preparando seu espaço…</main>;
  if (!user) return <main className="loading-screen">Não foi possível carregar a conta. Atualize a página.</main>;
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><MessageCircle size={23}/></span><span>NEXA</span></div>
      <div className="workspace-label">SEU ESPAÇO</div>
      <nav><a className="nav-active"><Compass size={18}/> Início</a><a href="#conversations"><MessageCircle size={18}/> Conversas</a><a href="#friends"><UsersRound size={18}/> Amigos</a><a><Sparkles size={18}/> Stories e feed <span className="nav-soon">Em breve</span></a><a><Gem size={18}/> Moedas e loja <span className="nav-soon">Em breve</span></a></nav>
      <div className="sidebar-bottom"><a><Settings size={18}/> Configurações</a><button onClick={logout}><LogOut size={18}/> Sair da conta</button></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><span className="muted">Seu espaço /</span> Início</div><div className="top-actions"><button aria-label="Notificações"><Bell size={19}/></button><div className="mini-avatar">{user.display_name.slice(0,1).toUpperCase()}</div></div></header>
      <div className="dashboard-content">
        <div className="welcome-block"><div className="eyebrow"><Sparkles size={15}/> SEU UNIVERSO COMEÇA AQUI</div><h1>Olá, {user.display_name} <span>✦</span></h1><p>Este é o começo do seu espaço na NEXA. Vamos deixar sua marca?</p></div>
        <div className="account-card"><div className="account-card-icon"><ShieldCheck size={22}/></div><div className="account-card-copy"><b>Sua conta está criada</b><span>Seu identificador exclusivo está pronto. Use-o para que amigos encontrem você futuramente.</span></div><div className="account-number"><small>SEU NÚMERO NEXA</small><strong>{user.account_number}</strong></div></div>
        <div className="section-title"><div><h2>Seu perfil</h2><p>Essas informações ajudam seus amigos a reconhecer você.</p></div><span className="saved-badge"><Check size={14}/> Conta ativa</span></div>
        <div className="profile-layout">
          <div className="profile-preview"><div className="profile-banner"><div className="banner-orb orb-one"/><div className="banner-orb orb-two"/></div><div className="profile-avatar">{user.display_name.slice(0,1).toUpperCase()}<span className="online-dot"/></div><div className="preview-body"><h3>{user.display_name}</h3><p>@{user.username}</p><div className="profile-id"><CircleUserRound size={15}/> {user.account_number}</div><div className="preview-bio">{user.bio || "Sua bio vai aparecer aqui. Conte um pouco sobre você."}</div><div className="preview-footer"><UsersRound size={15}/> 0 amigos <span>·</span> Na NEXA desde {new Date(user.created_at).toLocaleDateString("pt-BR")}</div></div></div>
          <form className="edit-card" onSubmit={save}><div className="edit-heading"><div><h3>Editar informações</h3><p>Personalize como você aparece.</p></div><CircleUserRound size={21}/></div><label>Nome de exibição<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={40} required/></label><label>Username<div className="username-field"><span>@</span><input value={user.username} readOnly/><Check size={16}/></div><small>Seu username é único. A alteração será implementada na etapa de conta.</small></label><label>Sobre você<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={240} rows={4} placeholder="O que seus amigos deveriam saber?"/></label>{status && <p className={status.includes("sucesso") ? "success-message" : "error-message"}>{status}</p>}<button className="primary-button">Salvar perfil <ChevronRight size={17}/></button></form>
        </div>
        <FriendsPanel />
        <ConversationsPanel currentUserId={user.id} />
        <div className="next-step"><div className="next-icon"><MessageCircle size={22}/></div><div><b>Próxima etapa: conversas e grupos</b><p>Conversas privadas e envio de mensagens estão conectados. Grupos, chamadas e notificações completas virão nas próximas etapas.</p></div><span className="planned-pill">Em desenvolvimento</span></div>
        <footer> NEXA · Construído por etapas, com segurança desde a base.</footer>
      </div>
    </section>
  </main>;
}