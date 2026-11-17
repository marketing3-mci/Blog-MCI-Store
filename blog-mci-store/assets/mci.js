// Funções compartilhadas entre o blog e o back-office.
(function () {
  const C = window.MCI_CONFIG;

  const FRENTES = {
    t: "Tecnologia que resolve",
    p: "Quem faz acontecer",
    n: "Da América Latina para o mundo",
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

  const somTxt = () => (window.MCI && window.MCI.rotuloSom) || "Ativar som";
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
      return /^https?:$/.test(x.protocol) || x.protocol === "mailto:" || x.protocol === "tel:" ? x.href : "";
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
    if (e.tipo === "arquivo" && o.reel) {
      const poster = urlSegura(o.capa) ? ' poster="' + esc(urlSegura(o.capa)) + '"' : "";
      caixa.classList.add("p-reel");
      caixa.innerHTML = '<video muted loop playsinline preload="metadata"' + poster + ' src="' + esc(e.src) + '#t=0.1"></video><button type="button" class="som" aria-label="' + esc(somTxt()) + '">' + esc(somTxt()) + '</button>';
      const v = caixa.querySelector("video"), b = caixa.querySelector(".som");
      const parar = () => { v.pause(); };
      if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        new IntersectionObserver(es => es.forEach(x => x.isIntersecting ? v.play().catch(() => {}) : parar()), { threshold: 0.5 }).observe(caixa);
      }
      b.onclick = ev => { ev.stopPropagation(); v.muted = !v.muted; b.textContent = v.muted ? somTxt() : "Sem som"; b.setAttribute("aria-label", b.textContent); v.play().catch(() => {}); };
      v.addEventListener("click", () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
      return caixa;
    }
    if (e.tipo === "arquivo") {
      const poster = urlSegura(o.capa) ? ' poster="' + esc(urlSegura(o.capa)) + '"' : "";
      if (o.fundo) {
        caixa.classList.add("p-fundo");
        caixa.innerHTML = '<video autoplay muted loop playsinline preload="auto"' + poster + ' src="' + esc(e.src) + '"></video><button type="button" class="som" aria-label="' + esc(somTxt()) + '">' + esc(somTxt()) + '</button>';
        const v = caixa.querySelector("video"), b = caixa.querySelector(".som");
        b.onclick = () => { v.muted = !v.muted; v.controls = !v.muted; b.textContent = v.muted ? somTxt() : "Sem som"; b.setAttribute("aria-label", b.textContent); if (!v.muted) v.play(); };
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
  // Linhas que começam com "-" são subitens do item de cima (viram submenu).
  function menu(texto) {
    const itens = [];
    String(texto || "").split("\n").forEach(l => {
      const sub = /^\s*[-–•]\s*/.test(l);
      const p = l.replace(/^\s*[-–•]\s*/, "").split("|").map(x => x.trim());
      if (!p[0]) return;
      const it = { rotulo: p[0], destino: p[1] || "#", filhos: [] };
      if (sub && itens.length) itens[itens.length - 1].filhos.push(it); else itens.push(it);
    });
    return itens;
  }
  // Capa de um vídeo do YouTube (máxima resolução, com a média como reserva)
  function capaYoutube(url) {
    const m = String(url || "").match(/(?:youtu\.be\/|v=|shorts\/|live\/|embed\/)([\w-]{11})/);
    return m ? { alta: "https://i.ytimg.com/vi/" + m[1] + "/maxresdefault.jpg", media: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" } : null;
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


  // ---------- Fontes escolhidas no painel ("Fontes e visual")
  const HELV = '"Helvetica Neue",Helvetica,Arial,sans-serif';
  const FONTES = {
    titulos: {
      unbounded: { nome: "Unbounded (atual)", css: '"Unbounded","Poppins",' + HELV },
      poppins: { nome: "Poppins", css: '"Poppins",' + HELV },
      montserrat: { nome: "Montserrat", css: '"Montserrat",' + HELV },
      helvetica: { nome: "Helvetica", css: HELV }
    },
    texto: {
      poppins: { nome: "Poppins (atual)", css: '"Poppins",' + HELV },
      montserrat: { nome: "Montserrat", css: '"Montserrat",' + HELV },
      helvetica: { nome: "Helvetica", css: HELV }
    },
    manuscrita: {
      caveat: { nome: "Caveat (recomendada)", css: '"Caveat",cursive' },
      kalam: { nome: "Kalam", css: '"Kalam",cursive' },
      patrick: { nome: "Patrick Hand", css: '"Patrick Hand",cursive' }
    }
  };
  const PADRAO_FONTES = { titulos: "unbounded", texto: "poppins", manuscrita: "caveat" };
  function fonte(tipo, chave) { const g = FONTES[tipo]; return (g[chave] || g[PADRAO_FONTES[tipo]]).css; }
  // Aplica as fontes como variáveis CSS: --disp (títulos), --sans (textos), --hand (manuscrita).
  function aplicarFontes(cfg, alvo) {
    const el = alvo || document.documentElement; cfg = cfg || {};
    el.style.setProperty("--disp", fonte("titulos", cfg.fonte_titulos));
    el.style.setProperty("--sans", fonte("texto", cfg.fonte_texto));
    el.style.setProperty("--hand", fonte("manuscrita", cfg.fonte_manuscrita));
  }
  const URL_FONTES = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Kalam:wght@400;700&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Patrick+Hand&family=Poppins:ital,wght@0,400;0,500;0,600;1,400&family=Unbounded:wght@500;600&display=swap";

  // ---------- Texto formatado (editor de blocos)
  // Só passa o que está nesta lista. Todo o resto é removido (scripts, estilos, iframes, atributos).
  const TAGS_OK = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, A: 1, UL: 1, OL: 1, LI: 1, H2: 1, H3: 1, BLOCKQUOTE: 1, SPAN: 1 };
  const TAGS_FORA = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, MATH: 1, FORM: 1, INPUT: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, LINK: 1, META: 1, IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1 };
  const CLASSES_OK = ["cor-marca", "cor-lima", "cor-menta", "cor-escura", "manuscrita", "maior"];
  function limparHtml(html) {
    const doc = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    const saida = document.createElement("div");
    const copiar = (de, para) => {
      de.childNodes.forEach(n => {
        if (n.nodeType === 3) { para.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        let tag = n.tagName;
        if (TAGS_FORA[tag]) return;
        if (tag === "DIV") tag = "P";
        if (tag === "H1") tag = "H2";
        if (tag === "H4" || tag === "H5" || tag === "H6") tag = "H3";
        if (!TAGS_OK[tag]) { copiar(n, para); return; }
        const el = document.createElement(tag === "B" ? "STRONG" : tag === "I" ? "EM" : tag);
        if (tag === "A") {
          const h = urlSegura(n.getAttribute("href"));
          if (!h) { copiar(n, para); return; }
          el.setAttribute("href", h);
          if (!/^(mailto|tel):/.test(h)) { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
        }
        if (tag === "SPAN") {
          const cls = String(n.getAttribute("class") || "").split(/\s+/).filter(c => CLASSES_OK.includes(c));
          if (!cls.length) { copiar(n, para); return; }
          el.className = cls.join(" ");
        }
        copiar(n, el);
        // Parágrafo dentro de parágrafo (comum ao colar) vira o conteúdo direto
        if (el.tagName === "P" && para.tagName === "P") { while (el.firstChild) para.appendChild(el.firstChild); return; }
        para.appendChild(el);
      });
    };
    copiar(doc.body, saida);
    // Texto solto no primeiro nível vai para dentro de parágrafos
    const final = document.createElement("div"); let p = null;
    [...saida.childNodes].forEach(n => {
      const bloco = n.nodeType === 1 && /^(P|UL|OL|H2|H3|BLOCKQUOTE)$/.test(n.tagName);
      if (bloco) { p = null; final.appendChild(n); return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !p) return;
      if (!p) { p = document.createElement("p"); final.appendChild(p); }
      p.appendChild(n);
    });
    final.querySelectorAll("p").forEach(x => { if (!x.textContent.trim() && !x.querySelector("br")) x.remove(); });
    return final.innerHTML;
  }

  // Texto antigo (campo "corpo") vira um bloco de texto com os mesmos parágrafos.
  function blocosDeTexto(t) {
    const html = String(t || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => "<p>" + esc(x).replace(/\n/g, "<br>") + "</p>").join("");
    return html ? [{ tipo: "texto", html }] : [];
  }
  // Texto puro dos blocos (guardado em "corpo" para busca, resumo e compatibilidade).
  function textoDeBlocos(blocos) {
    const div = document.createElement("div");
    return (blocos || []).map(b => {
      if (b.tipo === "texto" || b.tipo === "lado") { div.innerHTML = limparHtml(b.html); return [...div.querySelectorAll("p,li,h2,h3,blockquote")].map(e => e.textContent.trim()).filter(Boolean).join("\n\n") || div.textContent.trim(); }
      if (b.tipo === "titulo" || b.tipo === "citacao") return String(b.texto || "").trim();
      return "";
    }).filter(Boolean).join("\n\n");
  }

  // Desenha os blocos (blog e prévia do painel). Devolve um elemento pronto para inserir.
  function desenharBlocos(blocos) {
    const raiz = document.createElement("div"); raiz.className = "blocos";
    (blocos || []).forEach(b => {
      const al = b.alinhar === "centro" ? " al-centro" : b.alinhar === "dir" ? " al-dir" : "";
      let el;
      if (b.tipo === "texto") {
        el = document.createElement("div");
        el.className = "b b-texto" + al + (b.fonte === "titulos" ? " f-titulos" : b.fonte === "manuscrita" ? " f-hand" : "") + (b.tamanho === "grande" ? " t-grande" : "") + (b.fundo === "escuro" ? " fundo-escuro" : b.fundo === "marca" ? " fundo-marca" : "");
        el.innerHTML = limparHtml(b.html);
      } else if (b.tipo === "titulo") {
        el = document.createElement(b.nivel === 3 ? "h3" : "h2"); el.className = "b b-titulo" + al + (b.fonte === "manuscrita" ? " f-hand" : "");
        el.textContent = b.texto || "";
      } else if (b.tipo === "imagem") {
        const itens = (b.itens || []).filter(i => urlSegura(i.url));
        if (!itens.length) return;
        el = document.createElement("figure"); el.className = "b b-imagem larg-" + (b.largura || "texto") + " n" + itens.length;
        el.innerHTML = itens.map(i => '<div class="b-img"><img src="' + esc(urlSegura(i.url)) + '" alt="' + esc(i.legenda || "") + '" loading="lazy">' + (i.legenda ? "<figcaption>" + esc(i.legenda) + "</figcaption>" : "") + "</div>").join("");
      } else if (b.tipo === "lado") {
        el = document.createElement("div"); el.className = "b b-lado" + (b.lado === "dir" ? " img-dir" : "");
        el.innerHTML = (urlSegura(b.url) ? '<div class="b-img"><img src="' + esc(urlSegura(b.url)) + '" alt="" loading="lazy"></div>' : "") + '<div class="b-texto">' + limparHtml(b.html) + "</div>";
      } else if (b.tipo === "video") {
        if (!emb(b.url).tipo) return;
        el = document.createElement("div"); el.className = "b b-video vf";
        el.appendChild(player(b.url, { titulo: b.legenda || "", limpo: true }));
        if (b.legenda) el.insertAdjacentHTML("beforeend", '<p class="legenda">' + esc(b.legenda) + "</p>");
      } else if (b.tipo === "citacao") {
        el = document.createElement("blockquote"); el.className = "b b-citacao";
        el.innerHTML = "<p>" + esc(b.texto || "") + "</p>" + (b.autor ? "<cite>" + esc(b.autor) + "</cite>" : "");
      } else if (b.tipo === "separador") {
        el = document.createElement("hr"); el.className = "b b-sep";
      } else if (b.tipo === "botao") {
        const h = urlSegura(b.url); if (!h || !b.rotulo) return;
        el = document.createElement("p"); el.className = "b b-botao" + al;
        el.innerHTML = '<a class="btn" href="' + esc(h) + '"' + (/^https?:/.test(h) && !h.startsWith(location.origin) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(b.rotulo) + "</a>";
      }
      if (el) raiz.appendChild(el);
    });
    return raiz;
  }
  // Estilos dos blocos, usados no blog e no painel (prévia e editor).
  const CSS_BLOCOS = ".blocos{display:grid;gap:1.4rem}.blocos>.b{margin:0}" +
    ".b-texto p,.b-texto li{font-size:1.08rem;line-height:1.7}.b-texto p{margin:0 0 1rem}.b-texto>:last-child{margin-bottom:0}.b-texto ul,.b-texto ol{margin:0 0 1rem;padding-left:1.3rem;display:grid;gap:.35rem}" +
    ".b-texto h2,.b-titulo{font:500 clamp(1.4rem,2.6vw,1.9rem)/1.2 var(--disp);letter-spacing:-.02em;margin:.6rem 0 .2rem}.b-texto h3,h3.b-titulo{font:600 1.2rem/1.3 var(--disp);margin:.4rem 0 .1rem}" +
    ".b-texto blockquote{margin:0 0 1rem;padding-left:1rem;border-left:3px solid var(--teal)}.b-texto a{color:var(--at,#0F7A66);text-decoration-color:var(--teal);text-underline-offset:3px}" +
    ".cor-marca{color:var(--teal)}.cor-lima{color:#5E8F2F}.cor-menta{color:#3E8E80}.cor-escura{color:#0E1110}.manuscrita{font-family:var(--hand);font-size:1.35em;font-weight:700;line-height:1}.maior{font-size:1.25em}" +
    ".al-centro{text-align:center}.al-dir{text-align:right}.f-titulos{font-family:var(--disp)}.f-titulos p{font-family:var(--disp);letter-spacing:-.01em}.f-hand,.f-hand p{font-family:var(--hand);font-size:1.6rem;line-height:1.25}.t-grande p,.t-grande li{font-size:1.35rem;line-height:1.55}" +
    ".fundo-escuro{background:#0E1110;color:#F2F2F2;padding:clamp(1.4rem,4vw,2.4rem);border-radius:6px}.fundo-escuro .cor-escura{color:#fff}.fundo-marca{background:linear-gradient(135deg,#0F8C80,#1CA68D 55%,#34B8A0);color:#fff;padding:clamp(1.4rem,4vw,2.4rem);border-radius:6px}.fundo-marca .cor-marca{color:#0E1110}" +
    ".b-imagem{display:grid;gap:1rem}.b-imagem.n2{grid-template-columns:1fr 1fr}.b-imagem.n3{grid-template-columns:repeat(3,1fr)}.b-imagem img,.b-lado img{width:100%;border-radius:6px;display:block}.b-imagem.n2 img,.b-imagem.n3 img{aspect-ratio:4/3;object-fit:cover}.b-imagem figcaption,.b-video .legenda{font-size:.88rem;color:var(--muted,#4A5B56);margin-top:.5rem}" +
    ".larg-larga{margin-inline:min(0px,calc((100% - min(1100px,100vw - 2.5rem))/2))!important}.larg-cheia{margin-inline:calc(50% - 50vw)!important}.larg-cheia img{border-radius:0}" +
    ".b-lado img{max-height:70vh;object-fit:cover}.b-lado{display:grid;grid-template-columns:1fr 1fr;gap:clamp(1.2rem,3vw,2.4rem);align-items:center}.b-lado.img-dir .b-img{order:2}" +
    ".b-citacao{margin:.4rem 0;padding:1.2rem 0 1.2rem 1.4rem;border-left:3px solid var(--teal)}.b-citacao p{margin:0;font:500 clamp(1.2rem,2.2vw,1.55rem)/1.4 var(--disp);letter-spacing:-.01em}.b-citacao cite{display:block;margin-top:.6rem;font-style:normal;color:var(--muted,#4A5B56);font-size:.92rem}" +
    ".b-sep{border:0;height:1px;background:var(--line,#D5E0DD);margin:1rem 0}.b-video .p-iframe,.b-video .p-limpo{max-width:380px;margin-inline:auto}" +
    "@media (max-width:640px){.b-lado,.b-imagem.n2,.b-imagem.n3{grid-template-columns:1fr}.b-lado.img-dir .b-img{order:0}.larg-larga{margin-inline:0!important}}";

  (function estilos() {
    const st = document.createElement("style");
    st.textContent = ".p-limpo{aspect-ratio:9/16;container-type:inline-size;background:#000}" +
      ".p-limpo iframe{position:absolute;border:0;width:142.23%;left:-21.12%;top:-56px;height:calc(56px + 177.78cqw + 200px);max-width:none}" +
      ".p-fundo{background:#000}.p-fundo video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}" +
      ".p-reel{aspect-ratio:9/16;background:#000}.p-reel video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:pointer}" +
      ".p-reel .som,.p-fundo .som{position:absolute;right:.8rem;bottom:.8rem;z-index:3;font:600 .8rem/1 Poppins,Helvetica,Arial,sans-serif;padding:.5rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:rgba(14,17,16,.6);color:#fff;cursor:pointer}";
    document.head.appendChild(st);
    const sb = document.createElement("style"); sb.textContent = CSS_BLOCOS; document.head.appendChild(sb);
  })();

  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);

  window.MCI = { C, db, capaYoutube, FRENTES, SECOES, FONTES, PADRAO_FONTES, URL_FONTES, aplicarFontes, limparHtml, blocosDeTexto, textoDeBlocos, desenharBlocos, esc, urlSegura, emb, player, menu, dataBR, paragrafos };
})();
