"use client";
import { useState } from "react";
import { MessageCircle, Sparkles, ShieldCheck, UsersRound } from "lucide-react";

type Mode = "login" | "register";
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = mode === "register"
        ? { username, password, confirmPassword }
        : { username, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível continuar.");
      window.location.reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado."); }
    finally { setBusy(false); }
  }

  return <main className="auth-layout">
    <section className="hero-panel">
      <div className="brand"><span className="brand-icon"><MessageCircle size={24}/></span><span>NEXA</span><span className="beta">BETA</span></div>
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> SEU MUNDO, SUAS CONEXÕES</div>
        <h1>Mais perto de quem<br/><span>faz parte da sua vida.</span></h1>
        <p>Converse, compartilhe momentos e crie seu próprio espaço com seus amigos.</p>
        <div className="feature-row"><span><UsersRound size={18}/></span><div><b>Amizades de verdade</b><small>Uma rede feita para conectar pessoas.</small></div></div>
        <div className="feature-row"><span><ShieldCheck size={18}/></span><div><b>Seu espaço, suas regras</b><small>Seu perfil e suas configurações sob seu controle.</small></div></div>
      </div>
      <div className="hero-foot">© 2026 NEXA · Conecte-se do seu jeito</div>
    </section>
    <section className="form-panel">
      <div className="mobile-brand brand"><span className="brand-icon"><MessageCircle size={22}/></span><span>NEXA</span></div>
      <div className="auth-card">
        <div className="form-heading"><div className="eyebrow">BEM-VINDO À NEXA</div><h2>{mode === "register" ? "Crie seu espaço." : "Que bom ver você."}</h2><p>{mode === "register" ? "Comece com um username e uma senha." : "Entre para continuar de onde parou."}</p></div>
        <div className="mode-switch"><button className={mode === "register" ? "active" : ""} onClick={() => {setMode("register");setError("");}}>Criar conta</button><button className={mode === "login" ? "active" : ""} onClick={() => {setMode("login");setError("");}}>Entrar</button></div>
        <form onSubmit={submit}>
          <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="ex.: luna_azul" minLength={3} maxLength={24} required/><small>3–24 caracteres: letras, números e _</small></label>
          <label>Senha<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Pelo menos 10 caracteres" minLength={mode === "register" ? 10 : 1} maxLength={72} required/></label>
          {mode === "register" && <label>Confirme sua senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente" minLength={10} maxLength={72} required/></label>}
          {error && <div className="error-message" role="alert">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? "Aguarde..." : mode === "register" ? "Criar minha conta" : "Entrar na NEXA"} <span>→</span></button>
        </form>
        <div className="privacy-note"><ShieldCheck size={16}/><span>Sem e-mail ou telefone. Guarde sua senha: a recuperação segura por códigos será adicionada na próxima etapa.</span></div>
      </div>
    </section>
  </main>;
}