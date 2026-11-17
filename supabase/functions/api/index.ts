// API do Blog MCI (Supabase Edge Function "api").
// Acesso por chave gerada no painel (Chaves de API), enviada no cabeçalho x-api-key.
// Chave de leitura: lê posts publicados, vídeos, páginas, marcos e seções.
// Chave de escrita: também lê rascunhos e cria/edita posts e vídeos.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
const ROTAS = [
  "GET /api/posts?secao=produto&limite=20&inicio=0", "GET /api/posts/{id}", "GET /api/videos", "GET /api/paginas", "GET /api/paginas/{slug}",
  "GET /api/marcos", "GET /api/secoes", "POST /api/posts (chave de escrita)", "PATCH /api/posts/{id} (chave de escrita)",
  "POST /api/videos (chave de escrita)", "PATCH /api/videos/{id} (chave de escrita)",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);
  const rota = partes.slice(partes.indexOf("api") + 1);
  if (rota[0] === "v1") rota.shift();
  if (!rota.length) return json({ api: "Blog MCI", versao: 1, autenticacao: "cabeçalho x-api-key", rotas: ROTAS });

  const chave = req.headers.get("x-api-key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!chave.startsWith("mci_")) return json({ erro: "Envie a chave de API no cabeçalho x-api-key." }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
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
