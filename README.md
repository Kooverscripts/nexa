# NEXA — Fundação funcional

Aplicação web responsiva (Next.js + TypeScript) com cadastro por username e senha, número NEXA exclusivo, sessão HTTP-only, perfil editável, pesquisa de pessoas e solicitações/lista de amizades. A interface inclui pesquisa de pessoas, solicitações de amizade e conversas privadas com envio de mensagens e atualização automática por consulta periódica. A estrutura de banco para grupos está preparada, mas a criação/gestão de grupos, mensagens em tempo real via WebSocket, feed, stories, moedas, chamadas, mídia e administração permanecem em etapas futuras.

## Requisitos

- Node.js 20.9+ (recomendado Node 22 LTS)
- Conta/projeto Supabase com acesso ao SQL Editor
- npm

## 1. Configurar o banco

1. Crie um projeto no painel Supabase.
2. Abra **SQL Editor**.
3. Execute o conteúdo de `supabase/migrations/0001_foundation.sql`.
4. Execute também `supabase/migrations/0002_friends_and_messaging.sql` para criar as tabelas sociais.
5. Em **Project Settings → API**, copie a Project URL e a chave `service_role` (secret). Nunca use essa chave em componentes/client-side nem a publique no repositório.
6. O código utiliza uma tabela própria `nexa_users`, não Supabase Auth. Por isso, as credenciais são verificadas pela API Next.js; não há e-mail nem telefone. A tabela não concede acesso direto ao navegador.

## 2. Configurar ambiente

```bash
cp .env.example .env.local
```

Preencha:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`: gere um valor aleatório com pelo menos 32 bytes, por exemplo `openssl rand -base64 32`
- `APP_ORIGIN`: origem exata do site, por exemplo `http://localhost:3000`

Não comite `.env.local`. Se a chave service-role for exposta, rotacione-a imediatamente no painel Supabase.

## 3. Instalar e executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## 4. Testes e build

```bash
npm test
npm run build
npm start
```

## Rotas implementadas

- `POST /api/auth/register` — valida username/senha, gera hash bcrypt, tenta gerar número exclusivo e cria sessão.
- `POST /api/auth/login` — verifica senha e conta habilitada.
- `POST /api/auth/logout` — encerra a sessão.
- `GET /api/me` — retorna o perfil da sessão atual.
- `PATCH /api/me` — atualiza nome de exibição e bio.
- `GET /api/users/search?q=...` — pesquisa por username ou número NEXA, exigindo sessão.
- `GET /api/friends` — lista amizades e solicitações recebidas/enviadas.
- `POST /api/friends` — envia solicitação usando `targetId`.
- `PATCH /api/friends/:requestId` — aceita, recusa ou cancela uma solicitação.
- `GET /api/conversations` — lista conversas das quais o usuário participa.
- `POST /api/conversations` — abre/cria conversa privada com um amigo.
- `GET /api/conversations/:conversationId/messages` — lista mensagens, apenas para participantes.
- `POST /api/conversations/:conversationId/messages` — envia mensagem, apenas para participantes.

## Decisões e limitações importantes

- **Número exclusivo:** formato `0000-0000`; o índice único no PostgreSQL é a garantia final contra colisões concorrentes. O endpoint tenta novamente se colidir.
- **Senhas:** hash bcrypt com custo 12. Senhas nunca são retornadas pela API.
- **Sessões:** JWT HS256 em cookie HttpOnly, SameSite=Lax, Secure em produção, expiração de 7 dias.
- **Autenticação:** é uma implementação customizada, separada do Supabase Auth. O acesso ao banco passa pelo servidor Next.js usando a chave service-role. Não habilite chamadas diretas à tabela a partir do browser.
- **RLS:** está habilitado e não há políticas para leitura/escrita do browser. A service-role bypassa RLS, então cada endpoint deve verificar a sessão e limitar operações ao usuário autenticado.
- **Limitação de tentativas:** rate limiting distribuído ainda precisa ser adicionado antes de produção (por exemplo Redis/Upstash ou gateway). Não publique esta versão sem isso.
- **Recuperação de conta:** ainda não implementada. Para contas sem e-mail/telefone, a próxima etapa deve gerar códigos de recuperação de uso único, mostrar uma única vez e armazenar somente seus hashes.
- **Alteração de username/senha, gerenciamento de sessões e exclusão de conta:** ainda não implementados.
- **Armazenamento de mídia, avatares e banners:** campos reservados, upload ainda não implementado.
- **Administração e moderação:** não implementadas.
- **Proteção CSRF:** mutações verificam Origin e usam cookie SameSite=Lax; revise a política para seu domínio de produção e adicione testes de segurança.
- **Rate limit e enumeração:** a resposta de login é genérica, mas cadastro revela username ocupado conforme requisito de UX. Adicione limitação de requisições e monitoramento.
- **Política de senha:** mínimo de 10 caracteres, máximo de 72 bytes/caracteres efetivos para bcrypt; para produção, considere listas de senhas comprometidas e proteção adicional contra força bruta.
- **Números aleatórios:** a geração usa `crypto.randomInt` no servidor e o índice único do banco impede duplicação.
- **Produção:** configure HTTPS, backups, alertas, rate limiting, política de retenção, revisão de privacidade e testes de penetração.

## Próxima etapa

Próximas etapas: grupos e administração de membros, atualização de mensagens via Supabase Realtime/WebSocket, notificações, bloqueios e denúncias; depois stories/feed, uploads de mídia, carteira e loja de moedas com lançamentos auditáveis, chamadas de áudio/vídeo, recuperação de conta por códigos de uso único e ferramentas administrativas.
