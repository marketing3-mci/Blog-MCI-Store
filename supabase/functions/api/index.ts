// API do Blog MCI (Supabase Edge Function "api").
// Acesso por chave gerada no painel (Chaves de API), enviada no cabeçalho x-api-key.
// Chave de leitura: lê posts publicados, vídeos, páginas, marcos e seções.
// Chave de escrita: também lê rascunhos e cria/edita posts e vídeos.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};
const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

async function sha256(texto: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const SECOES: Record<string, string> = {
  materia: "Matérias", educativo: "Vídeos educativos", evento: "Eventos", produto: "Produtos e lançamentos", cinema: "Cinema: filmes e séries",
};
const TABELAS: Record<string, string> = { posts: "posts", videos: "videos", paginas: "paginas", marcos: "marcos" };
const CAMPOS_ESCRITA: Record<string, string[]> = {
  posts: ["titulo", "resumo", "corpo", "blocos", "secao", "frente", "status", "data", "autor", "capa", "video_url", "url", "cortes", "video_id"],
  videos: ["titulo", "url", "link_rede", "rede", "frente", "tipo", "capa", "no_rodape", "exibicao"],
};

// ---- Newsletter: inscrição pública e envio ao SendPulse
// Segredos (Supabase → Edge Functions → Secrets): SENDPULSE_ID, SENDPULSE_SECRET, SENDPULSE_LISTA (id do livro de endereços).
const INTERESSES = ["novidades", "dicas", "eventos", "mci"];
const spConfigurado = () => !!(Deno.env.get("SENDPULSE_ID") && Deno.env.get("SENDPULSE_SECRET") && Deno.env.get("SENDPULSE_LISTA"));
let spToken = { valor: "", ate: 0 };
async function sendpulse(metodo: string, caminho: string, corpo: unknown) {
  if (Date.now() > spToken.ate) {
    const r = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: Deno.env.get("SENDPULSE_ID"), client_secret: Deno.env.get("SENDPULSE_SECRET") }),
    });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.access_token) throw new Error("SendPulse recusou o ID/Secret (" + r.status + ")");
    spToken = { valor: t.access_token, ate: Date.now() + (Number(t.expires_in) || 3600) * 1000 - 60000 };
  }
  const r = await fetch("https://api.sendpulse.com" + caminho, {
    method: metodo, headers: { "content-type": "application/json", authorization: "Bearer " + spToken.valor }, body: JSON.stringify(corpo),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error("SendPulse " + r.status + ": " + txt.slice(0, 160));
  return txt;
}
type Inscrito = { id: string; email: string; nome: string | null; interesses: string[] };
// deno-lint-ignore no-explicit-any
async function enviarAoSendPulse(db: any, lista: Inscrito[]) {
  if (!spConfigurado() || !lista.length) return { enviados: 0, configurado: spConfigurado() };
  const livro = Deno.env.get("SENDPULSE_LISTA");
  try {
    await sendpulse("POST", "/addressbooks/" + livro + "/emails", {
      emails: lista.map((i) => ({ email: i.email, variables: { Name: i.nome || "", nome: i.nome || "", interesses: (i.interesses || []).join(", "), origem: "Blog MCI" } })),
    });
    await db.from("inscritos").update({ sendpulse_em: new Date().toISOString(), sendpulse_erro: null }).in("id", lista.map((i) => i.id));
    return { enviados: lista.length, configurado: true };
  } catch (e) {
    await db.from("inscritos").update({ sendpulse_erro: String((e as Error).message).slice(0, 300) }).in("id", lista.map((i) => i.id));
    return { enviados: 0, configurado: true, erro: String((e as Error).message) };
  }
}

const ROTAS = [
  "GET /api/posts?secao=produto&limite=20&inicio=0", "GET /api/posts/{id}", "GET /api/videos", "GET /api/paginas", "GET /api/paginas/{slug}",
  "GET /api/marcos", "GET /api/secoes", "POST /api/posts (chave de escrita)", "PATCH /api/posts/{id} (chave de escrita)",
  "POST /api/videos (chave de escrita)", "PATCH /api/videos/{id} (chave de escrita)",
  "POST /api/inscricao (pública: formulário de newsletter do blog)",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);
  const rota = partes.slice(partes.indexOf("api") + 1);
  if (rota[0] === "v1") rota.shift();
  if (!rota.length) return json({ api: "Blog MCI", versao: 1, autenticacao: "cabeçalho x-api-key", rotas: ROTAS });


  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Inscrição na newsletter (pública, sem chave)
  if (rota[0] === "inscricao" && !rota[1] && req.method === "POST") {
    const c = await req.json().catch(() => null);
    if (!c || typeof c !== "object") return json({ erro: "Dados inválidos." }, 400);
    if (c.site) return json({ ok: true }); // armadilha para robôs
    const email = String(c.email || "").trim().toLowerCase().slice(0, 200);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erro: "Confira o e-mail." }, 400);
    if (c.consentimento !== true) return json({ erro: "Marque a autorização para receber e-mails." }, 400);
    const nome = String(c.nome || "").replace(/\s+/g, " ").trim().slice(0, 80) || null;
    const interesses = Array.isArray(c.interesses) ? c.interesses.map(String).filter((x: string) => INTERESSES.includes(x)) : [];
    const origem = String(c.origem || "").slice(0, 160) || null;
    const { data: ja } = await db.from("inscritos").select("id, cancelado_em").eq("email", email).maybeSingle();
    const dados = { email, nome, interesses, origem, consentimento_em: new Date().toISOString(), cancelado_em: null, sendpulse_em: null, sendpulse_erro: null };
    const { data: ins, error } = ja
      ? await db.from("inscritos").update(dados).eq("id", ja.id).select("id, email, nome, interesses").single()
      : await db.from("inscritos").insert(dados).select("id, email, nome, interesses").single();
    if (error) return json({ erro: "Não foi possível salvar agora. Tente de novo." }, 500);
    await enviarAoSendPulse(db, [ins as Inscrito]);
    return json({ ok: true, novo: !ja }, ja ? 200 : 201);
  }

  // Painel: reenviar pendentes ao SendPulse e retirar os cancelados (login de editor/admin)
  if (rota[0] === "inscricao" && rota[1] === "sincronizar" && req.method === "POST") {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jwt } }, auth: { persistSession: false } });
    const { data: pode } = await usuario.rpc("pode", { minimo: "editor" });
    if (pode !== true) return json({ erro: "Entre no painel como editor ou admin." }, 401);
    if (!spConfigurado()) return json({ configurado: false, erro: "Faltam os segredos do SendPulse na função api." }, 400);
    const { data: pend } = await db.from("inscritos").select("id, email, nome, interesses").is("cancelado_em", null).is("sendpulse_em", null).limit(500);
    const r = await enviarAoSendPulse(db, (pend || []) as Inscrito[]);
    const { data: canc } = await db.from("inscritos").select("id, email").not("cancelado_em", "is", null).not("sendpulse_em", "is", null).limit(500);
    let retirados = 0;
    if (canc?.length) {
      try {
        await sendpulse("DELETE", "/addressbooks/" + Deno.env.get("SENDPULSE_LISTA") + "/emails", { emails: canc.map((x) => x.email) });
        await db.from("inscritos").update({ sendpulse_em: null }).in("id", canc.map((x) => x.id));
        retirados = canc.length;
      } catch (e) { return json({ ...r, retirados: 0, erro: String((e as Error).message) }, 502); }
    }
    return json({ ...r, retirados });
  }

  const chave = req.headers.get("x-api-key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!chave.startsWith("mci_")) return json({ erro: "Envie a chave de API no cabeçalho x-api-key." }, 401);

  const { data: k } = await db.from("api_chaves").select("id, permissao, revogada_em").eq("hash", await sha256(chave)).maybeSingle();
  if (!k || k.revogada_em) return json({ erro: "Chave inválida ou revogada." }, 401);
  await db.from("api_chaves").update({ ultimo_uso: new Date().toISOString() }).eq("id", k.id);
  const escrita = k.permissao === "escrita";
  const [recurso, id] = rota;

  if (req.method === "GET") {
    if (recurso === "secoes") {
      const { data: cfg } = await db.from("site_config").select("secoes").eq("id", "config").maybeSingle();
      const sc = (cfg?.secoes || {}) as Record<string, Record<string, string>>;
      return json({ dados: Object.entries(SECOES).map(([k2, nome]) => ({ id: k2, nome: sc[k2]?.titulo || nome, texto: sc[k2]?.texto || null, video: sc[k2]?.video || null, endereco: "/?secao=" + k2 })) });
    }
    const tabela = TABELAS[recurso];
    if (!tabela) return json({ erro: "Rota não encontrada.", rotas: ROTAS }, 404);
    let q = db.from(tabela).select("*");
    if (recurso === "posts") {
      if (!escrita) q = q.eq("status", "publicado");
      else if (url.searchParams.get("status")) q = q.eq("status", url.searchParams.get("status")!);
      if (url.searchParams.get("secao")) q = q.eq("secao", url.searchParams.get("secao")!);
      q = q.order("data", { ascending: false });
    }
    if (recurso === "marcos") q = q.order("ordem");
    if (recurso === "videos") q = q.order("criado_em", { ascending: false });
    if (id) {
      const campo = recurso === "paginas" && !/^[0-9a-f-]{36}$/i.test(id) ? "slug" : "id";
      const { data, error } = await q.eq(campo, id).maybeSingle();
      if (error) return json({ erro: error.message }, 400);
      return data ? json(data) : json({ erro: "Não encontrado." }, 404);
    }
    const limite = Math.min(100, Math.max(1, Number(url.searchParams.get("limite")) || 20));
    const inicio = Math.max(0, Number(url.searchParams.get("inicio")) || 0);
    const { data, error } = await q.range(inicio, inicio + limite - 1);
    if (error) return json({ erro: error.message }, 400);
    return json({ dados: data, limite, inicio });
  }

  if (req.method === "POST" || req.method === "PATCH") {
    if (!escrita) return json({ erro: "Esta chave é só de leitura." }, 403);
    const campos = CAMPOS_ESCRITA[recurso];
    if (!campos) return json({ erro: "Só é possível criar e editar posts e vídeos." }, 404);
    const corpo = await req.json().catch(() => null);
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return json({ erro: "Envie um JSON com os campos." }, 400);
    const d: Record<string, unknown> = Object.fromEntries(Object.entries(corpo).filter(([c]) => campos.includes(c)));
    if (recurso === "posts" && d.status && !["rascunho", "agendado", "publicado"].includes(String(d.status))) return json({ erro: "status deve ser rascunho, agendado ou publicado." }, 400);
    if (recurso === "posts" && d.secao && !SECOES[String(d.secao)]) return json({ erro: "secao inválida.", secoes: Object.keys(SECOES) }, 400);
    if (req.method === "POST") {
      if (!d.titulo) return json({ erro: "O campo titulo é obrigatório." }, 400);
      if (recurso === "videos" && !d.url) return json({ erro: "O campo url é obrigatório." }, 400);
      if (recurso === "posts" && !d.status) d.status = "rascunho";
      const { data, error } = await db.from(recurso).insert(d).select().single();
      return error ? json({ erro: error.message }, 400) : json(data, 201);
    }
    if (!id) return json({ erro: "Informe o id na rota: /api/" + recurso + "/{id}" }, 400);
    const { data, error } = await db.from(recurso).update(d).eq("id", id).select().maybeSingle();
    if (error) return json({ erro: error.message }, 400);
    return data ? json(data) : json({ erro: "Não encontrado." }, 404);
  }
  return json({ erro: "Método não permitido." }, 405);
});
