# Blog MCI Store

Blog público (`/`) e back-office (`/admin/`) da MCI Store. Site estático (HTML, CSS e JavaScript puro, sem etapa de build), publicado na Vercel a partir deste repositório, com dados no Supabase.

## Estrutura

```
index.html          Blog (visual v2 aprovado), lê tudo do banco
admin/index.html    Back-office com login
assets/config.js    Endereço do Supabase e chave pública (publishable)
assets/mci.js       Funções comuns: cliente do banco, players de vídeo, menu, datas
assets/*.png|jpg    Logo principal, logo branca, CinePro e adesivo da caixa
vercel.json         Cabeçalhos de segurança e rota /admin
```

## Banco (Supabase, projeto `blog-mcistore`)

| Tabela | Uso |
|---|---|
| `posts` | Matérias. `status`: rascunho, agendado, publicado. `video_id` = vídeo full; `cortes` = lista de ids de vídeos ligados. |
| `videos` | Links das redes (YouTube, Instagram, TikTok, Facebook). `tipo`: Vídeo full, Corte ou Reels, Post. |
| `marcos` | Linha do tempo da página Sobre. |
| `paginas` | Páginas extras (`/?pagina=slug`). |
| `site_config` | Linha única (`id = 'config'`): topo, menu, contatos, missão, visão e valores. |
| `perfis` | Uma linha por usuário do Auth, com o nível de acesso. |

Imagens enviadas pelo painel vão para o bucket público `midia`, reduzidas a no máximo 1600 px.

### Segurança (RLS)

- Visitante (anon): lê só posts publicados, vídeos, marcos, páginas e configuração.
- Níveis em `perfis.nivel`: `leitor` < `colaborador` < `editor` < `admin`.
  - leitor: vê rascunhos, não altera nada;
  - colaborador: cria e edita posts e vídeos e envia imagens;
  - editor: além disso, exclui e edita marcos, páginas e configuração;
  - admin: tudo, inclusive mudar o nível das pessoas.
- O **primeiro usuário criado no Auth vira admin** automaticamente (gatilho `novo_usuario`). Os seguintes entram como leitor.
- Ninguém consegue mudar o próprio nível. Só um admin altera `perfis`.
- A chave em `assets/config.js` é a publishable (pública). **Nunca** coloque a `service_role`/secret no site.

Para baixar o esquema como migração: `supabase db pull` (Supabase CLI) ligado ao projeto.

## Vídeos

`MCI.emb(url)` converte o link no endereço do player:
YouTube → `youtube-nocookie.com/embed/ID` · Instagram → `instagram.com/reel/CODE/embed` · TikTok → `tiktok.com/embed/v2/ID` · Facebook → `facebook.com/plugins/video.php`.
O player só carrega quando a pessoa clica na capa (página mais leve). Posts privados ou com incorporação desativada não aparecem; o link continua válido.

## Integrações e plugins

- `window.MCI.db` é o cliente do Supabase já configurado.
- O back-office dispara `mci:salvo` e `mci:excluido` no `window`, com `{ tabela, registro | id }` em `event.detail`.
- Para ligar ao banco da MCI ou a outro sistema, o caminho mais simples é uma Edge Function ou um webhook do Supabase (Database → Webhooks) nas tabelas acima.

## Configuração no Supabase (uma vez)

1. **Authentication → URL Configuration**: Site URL = `https://blog-mci-store.vercel.app/admin`. Em Redirect URLs, adicione `https://blog-mci-store.vercel.app/admin`.
2. **Authentication → Users → Add user → Create new user**: e-mail e senha do primeiro administrador, marcando *Auto Confirm User*.
3. **Authentication → Sign In / Providers**: desligue *Allow new users to sign up*. Novas pessoas entram só por convite (*Add user → Send invitation*).

## Vercel

O projeto não precisa de comando de build: *Framework Preset* = Other e *Output Directory* vazio (raiz). As variáveis de ambiente do Supabase criadas pela integração não são usadas pelo site estático. A proteção de acesso da Vercel (Deployment Protection) está ligada: só quem tem acesso à equipe da Vercel abre o site.
