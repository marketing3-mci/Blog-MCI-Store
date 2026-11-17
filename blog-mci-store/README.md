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

## Editor de blocos, seções e textos (nov/2026)

- **Posts e páginas** usam o editor de blocos (`assets/editor-blocos.js`): texto com formatação (negrito, itálico, links, listas, cores da marca, trecho manuscrito), título, imagem (1 a 3 lado a lado, largura do texto/larga/tela inteira), imagem + texto, vídeo, citação, botão e divisória. Os blocos ficam em `posts.blocos` / `paginas.blocos` (jsonb); `corpo`/`texto` guardam o texto puro para compatibilidade. Posts antigos sem blocos continuam aparecendo pelo `corpo`.
- **Segurança:** todo HTML do editor passa por `MCI.limparHtml` (lista fechada de tags e classes) ao salvar e ao exibir.
- **Post imersivo:** o vídeo do post abre a página, no topo. Sem vídeo próprio, o topo usa o vídeo da seção (`site_config.secoes[secao].video`), depois a capa.
- **Páginas de seção:** `/?secao=produto` (e `educativo`, `evento`, `materia`, `cinema`), com vídeo, nome e texto configurados em *Seções do blog*.
- **Prévia de rascunho:** o painel abre `/?post=ID`; quem está logado vê o post mesmo sem publicar.
- **Textos do blog:** títulos e textos fixos da página inicial em `site_config.textos` (jsonb), aplicados nos elementos com `data-t`.
- **Sobre a MCI:** `sobre_*` em `site_config`; linha do tempo horizontal na ordem do campo `ordem` dos marcos.
- **Fontes:** `MCI.FONTES` + `MCI.aplicarFontes(cfg)` → variáveis `--disp`, `--sans`, `--hand` (títulos: Unbounded, Poppins, Montserrat, Helvetica; textos: Poppins, Montserrat, Helvetica; manuscrita: Caveat, Kalam, Patrick Hand).

## Menu e Reels (nov/2026)

- **Menu:** em *Site e menu*, linhas que começam com `-` viram submenu do item de cima. Seções sem posts publicados somem do menu sozinhas. No celular e no tablet (até 900 px) o menu abre em tela cheia pelo botão ☰.
- **Reels:** `videos.url` é o que toca (MP4 enviado ou link) e `videos.link_rede` é o post na rede (botão "Ver no Instagram"). Reels em MP4 tocam sem som, em repetição, só quando aparecem na tela (`player(url, { reel: true })`). Sem MP4, o blog usa o player do Instagram, que Safari e Android costumam bloquear; o painel avisa ("sem MP4").
- **Topo no celular:** em telas de toque o YouTube não é usado como fundo (aparecem controles); entra a capa do vídeo com zoom lento.

## Análises, chaves de API e autenticador (nov/2026)

- **Análises:** contagem anônima própria na tabela `eventos` (visita e clique; sem cookies, sem IP), resumida pela função `resumo_eventos(dias)` e mostrada em *Análises*. O Google Analytics 4 (`site_config.ga_id`) só carrega depois do "Aceitar" no aviso de cookies; os cliques vão ao GA como o evento `clique`.
- **API:** Supabase Edge Function `api` (código em `supabase/functions/api/index.ts`), servida também em `/api` pelo `vercel.json`. Chaves geradas em *Chaves de API* (só admin), guardadas como SHA-256 em `api_chaves`; permissão `leitura` ou `escrita`; revogação imediata.
- **Autenticador (2FA):** obrigatório para todos no login do painel (Supabase Auth MFA/TOTP). Na base, `pode()` exige sessão `aal2`. Para quem perdeu o celular: Supabase → Authentication → Users → remover o fator MFA.

## Newsletter e Google Tag Manager (nov/2026)

- **Inscrições:** formulário acima do rodapé (todas as páginas) envia para `POST /api/inscricao` (rota pública da função `api`, com armadilha anti-robô). Os dados ficam na tabela `inscritos` (RLS: só editor+ vê) com a data da autorização (LGPD). Tela *Inscritos (newsletter)* no painel: lista, busca, cancelar/reativar, exportar CSV, ligar/desligar o formulário (`site_config.inscricao.ativo`).
- **SendPulse:** com os segredos `SENDPULSE_ID`, `SENDPULSE_SECRET` e `SENDPULSE_LISTA` na função `api`, cada inscrição entra no livro de endereços (variáveis `Name` e `interesses`). O botão "Enviar ao SendPulse agora" (`POST /api/inscricao/sincronizar`, login de editor) envia pendentes e retira cancelados.
- **Google:** `site_config.gtm_id` (Tag Manager) e/ou `ga_id`. Com GTM, o blog carrega só o GTM (GA4, Ads e 360 configurados dentro dele). Consent Mode v2: tudo negado por padrão, liberado no "Aceitar". Eventos no dataLayer: `clique_blog` (`rotulo`, `destino`) e `newsletter_inscricao`. Link "Preferências de cookies" no rodapé refaz a escolha.
