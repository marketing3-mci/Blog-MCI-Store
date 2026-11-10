// Funções compartilhadas entre o blog e o back-office.
(function () {
  const C = window.MCI_CONFIG;

  const FRENTES = {
    t: "Tecnologia que resolve",
    p: "Quem faz acontecer",
    n: "Do Nordeste para o mundo",
    s: "Conhecimento de set",
    m: "MCI em movimento"
  };

  // Seções do blog (onde o post aparece).
  const SECOES = {
    materia: "Matérias",
    educativo: "Vídeos educativos",
    evento: "Eventos",
    produto: "Produtos e lançamentos",
    cinema: "Cinema: filmes e séries"
  };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Só deixa passar links http(s) — evita "javascript:" em campos editáveis.
  function urlSegura(u) {
    if (!u || !String(u).trim()) return "";
    try {
      const x = new URL(String(u || ""), location.href);
      return /^https?:$/.test(x.protocol) || x.protocol === "mailto:" ? x.href : "";
    } catch (e) { return ""; }
  }

  // Reconhece a rede e monta o endereço do player incorporado.
  // tipo: "facade" (YouTube: capa + clique), "iframe" (Instagram/TikTok/Facebook: player direto), "arquivo" (vídeo enviado).
  function emb(url) {
    const u = String(url || "").trim();
    let m;
    if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/i)))
      return { rede: "YouTube", tipo: "facade", src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0&autoplay=1", vertical: /shorts\//i.test(u),
               miniatura: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" };
    if ((m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i)))
      return { rede: "Instagram", tipo: "iframe", src: "https://www.instagram.com/" + (m[1].toLowerCase().startsWith("reel") ? "reel" : m[1]) + "/" + m[2] + "/embed", vertical: true, proporcao: 0.56 };
    if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/i)))
      return { rede: "TikTok", tipo: "iframe", src: "https://www.tiktok.com/embed/v2/" + m[1], vertical: true, proporcao: 0.56 };
    if (/facebook\.com|fb\.watch/i.test(u))
      return { rede: "Facebook", tipo: "iframe", src: "https://www.facebook.com/plugins/video.php?show_text=false&href=" + encodeURIComponent(u), vertical: /reel/i.test(u), proporcao: /reel/i.test(u) ? 0.56 : 1.78 };
    if (/\.(mp4|mov|webm)(\?|$)/i.test(u) || /\/storage\/v1\/object\/public\/[^/]+\/video/i.test(u))
      return { rede: "Vídeo", tipo: "arquivo", src: urlSegura(u), vertical: false };
    return { rede: "", tipo: "", src: "", vertical: false };
  }

  // Monta o player de um vídeo. opcoes: { titulo, capa, legenda, classe, limpo, fundo }
  // Instagram/TikTok aparecem direto (a própria rede mostra a capa); YouTube mostra a miniatura e toca ao clicar.
  // limpo: no Instagram, mostra só o vídeo em 9:16, sem cabeçalho, legenda e botões do Instagram.
  // fundo: vídeo enviado toca sozinho, sem som e em repetição (para o topo do blog).
  function player(url, opcoes) {
    const o = opcoes || {}, e = emb(url), caixa = document.createElement("div");
    caixa.className = "player-midia " + (o.classe || "") + " p-" + (e.tipo || "link");
    if (e.tipo === "iframe" && e.rede === "Instagram" && o.limpo) {
      // O player do Instagram tem cabeçalho de 54 px e mídia em 4:5 com o reel (9:16) centralizado.
      // Ampliando o quadro 142,2% e escondendo o cabeçalho, o reel preenche um cartão 9:16 sem bordas.
      caixa.classList.add("p-limpo");
      caixa.innerHTML = '<iframe src="' + esc(e.src) + '" title="' + esc(o.titulo || "Vídeo") + '" loading="lazy" scrolling="no" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      return caixa;
    }
    if (e.tipo === "iframe") {
      caixa.style.setProperty("--prop", e.proporcao || 0.56);
      caixa.innerHTML = '<iframe src="' + esc(e.src) + '" title="' + esc(o.titulo || "Vídeo") + '" loading="lazy" scrolling="no" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      return caixa;
    }
    if (e.tipo === "arquivo") {
      const poster = urlSegura(o.capa) ? ' poster="' + esc(urlSegura(o.capa)) + '"' : "";
      if (o.fundo) {
        caixa.classList.add("p-fundo");
        caixa.innerHTML = '<video autoplay muted loop playsinline preload="auto"' + poster + ' src="' + esc(e.src) + '"></video><button type="button" class="som" aria-label="Ativar som">Ativar som</button>';
        const v = caixa.querySelector("video"), b = caixa.querySelector(".som");
        b.onclick = () => { v.muted = !v.muted; v.controls = !v.muted; b.textContent = v.muted ? "Ativar som" : "Sem som"; b.setAttribute("aria-label", b.textContent); if (!v.muted) v.play(); };
        return caixa;
      }
      caixa.innerHTML = '<video controls playsinline preload="metadata"' + poster + ' src="' + esc(e.src) + '"></video>';
      return caixa;
    }
    const capa = urlSegura(o.capa) || e.miniatura || "";
    const b = document.createElement("button");
    b.type = "button"; b.className = "facade";
    if (capa) b.style.backgroundImage = "linear-gradient(transparent 55%,rgba(0,0,0,.6)),url('" + capa.replace(/'/g, "%27") + "')";
    b.setAttribute("aria-label", "Assistir: " + (o.titulo || "vídeo"));
    b.innerHTML = '<span class="play"></span>' + (o.titulo ? '<span class="cap"><b>' + esc(o.titulo) + "</b><span>" + esc(o.legenda || (e.rede ? "Assista no " + e.rede : "")) + "</span></span>" : "");
    b.addEventListener("click", () => {
      if (e.src) b.outerHTML = '<iframe src="' + esc(e.src) + '" title="' + esc(o.titulo || "Vídeo") + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      else { const l = urlSegura(url); if (l) window.open(l, "_blank", "noopener"); }
    });
    caixa.appendChild(b);
    return caixa;
  }

  // Lê o menu no formato "Rótulo | destino", uma linha por item.
  function menu(texto) {
    return String(texto || "").split("\n").map(l => l.split("|").map(s => s.trim()))
      .filter(p => p[0]).map(p => ({ rotulo: p[0], destino: p[1] || "#" }));
  }

  function dataBR(d) {
    if (!d) return "";
    const [a, m, dia] = String(d).slice(0, 10).split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return Number(dia) + " " + meses[Number(m) - 1] + " " + a;
  }

  // Texto simples com parágrafos e links; nada de HTML cru vindo do banco.
  function paragrafos(t) {
    return String(t || "").split(/\n{2,}/).map(p =>
      "<p>" + esc(p).replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') + "</p>"
    ).join("");
  }

  (function estilos() {
    const st = document.createElement("style");
    st.textContent = ".p-limpo{aspect-ratio:9/16;container-type:inline-size;background:#000}" +
      ".p-limpo iframe{position:absolute;border:0;width:142.23%;left:-21.12%;top:-54px;height:calc(54px + 177.78cqw + 200px);max-width:none}" +
      ".p-fundo{background:#000}.p-fundo video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}" +
      ".p-fundo .som{position:absolute;right:.8rem;bottom:.8rem;z-index:3;font:600 .8rem/1 Poppins,Helvetica,Arial,sans-serif;padding:.5rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:rgba(14,17,16,.6);color:#fff;cursor:pointer}";
    document.head.appendChild(st);
  })();

  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);

  window.MCI = { C, db, FRENTES, SECOES, esc, urlSegura, emb, player, menu, dataBR, paragrafos };
})();
