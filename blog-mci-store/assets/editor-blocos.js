// Editor de blocos do painel (posts e páginas), no estilo dos editores de e-mail e de páginas:
// texto com barra de formatação, títulos, imagens entre os textos, imagem + texto lado a lado,
// vídeo, citação, botão e divisória. O resultado é uma lista de blocos (JSON) salva em "blocos".
(function () {
  const { esc, urlSegura, emb, player, limparHtml } = window.MCI;

  const TIPOS = [
    ["texto", "Texto", "¶"], ["titulo", "Título", "H"], ["imagem", "Imagem", "▣"], ["lado", "Imagem + texto", "◧"],
    ["video", "Vídeo", "▶"], ["citacao", "Citação", "❝"], ["botao", "Botão", "⬭"], ["separador", "Divisória", "—"]
  ];
  const NOME = Object.fromEntries(TIPOS.map(t => [t[0], t[1]]));

  const CSS = `
.eb{position:relative}
.eb-barra{position:sticky;top:-1.5rem;z-index:5;display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;padding:.5rem;margin:0 0 .8rem;background:#1C2421;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.35)}
.eb-barra button,.eb-barra select{height:34px;min-width:34px;padding:0 .55rem;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--txt);font:500 .88rem var(--sans);cursor:pointer;width:auto}
.eb-barra select{border-color:var(--line);background:var(--ink)}
.eb-barra button:hover{background:rgba(28,166,141,.18);border-color:rgba(28,166,141,.4)}
.eb-barra .sep{width:1px;height:22px;background:var(--line);margin:0 .2rem}
.eb-barra[data-inativa] button[data-rico],.eb-barra[data-inativa] select{opacity:.4;pointer-events:none}
.eb-barra .dica{font-size:.78rem;color:var(--mut);margin-left:auto;padding-right:.3rem}
.eb-barra .cor{width:18px;height:18px;border-radius:50%;display:inline-block;vertical-align:middle;border:1px solid rgba(255,255,255,.3)}
.eb-canvas{--teal:#1CA68D;--at:#0F7A66;--muted:#4A5B56;--line:#D5E0DD;--bg:#F2F2F2;background:#F2F2F2;color:#0E1110;border-radius:12px;padding:clamp(1rem,3vw,2.2rem);font-family:var(--sans);min-height:320px}
.eb-canvas .eb-pagina{max-width:760px;margin-inline:auto}
.eb-bloco{position:relative;border:1px dashed transparent;border-radius:8px;padding:.6rem .7rem;margin:0 -.7rem .2rem;transition:border-color .15s}
.eb-bloco:hover,.eb-bloco:focus-within{border-color:rgba(28,166,141,.55)}
.eb-ctrl{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:-.2rem 0 .5rem;font:500 .78rem var(--sans);color:#4A5B56;opacity:.0;transition:opacity .15s}
.eb-bloco:hover>.eb-ctrl,.eb-bloco:focus-within>.eb-ctrl{opacity:1}
.eb-ctrl .nome{font-weight:600;color:#0F7A66;margin-right:.3rem;text-transform:uppercase;letter-spacing:.08em;font-size:.7rem}
.eb-ctrl select,.eb-ctrl button{height:28px;width:auto;padding:0 .5rem;border-radius:6px;border:1px solid #C9D6D2;background:#fff;color:#0E1110;font:500 .78rem var(--sans);cursor:pointer}
.eb-ctrl button:hover{border-color:#1CA68D;color:#0F7A66}
.eb-ctrl .del:hover{border-color:#F07167;color:#B23A2F}
.eb-ctrl .esp{flex:1}
.eb-edit{outline:none;min-height:1.6em;cursor:text}
.eb-edit:empty::before{content:attr(data-vazio);color:#8FA39D}
.eb-edit p:only-child:empty::before{content:attr(data-vazio)}
.eb-campos{display:grid;gap:.5rem;margin-top:.5rem}
.eb-campos input,.eb-campos textarea{background:#fff;color:#0E1110;border:1px solid #C9D6D2;border-radius:6px;padding:.5rem .65rem;font:400 .92rem var(--sans);min-height:0}
.eb-campos textarea{min-height:70px}
.eb-campos label{color:#4A5B56;font-size:.8rem;margin:0}
.eb-imgs{display:grid;gap:.8rem;grid-template-columns:repeat(var(--n,1),minmax(0,1fr))}
.eb-img{display:grid;gap:.4rem}
.eb-img .quadro{aspect-ratio:16/9;border-radius:6px;border:1.5px dashed #9FB5AF;background:#E6EEEC center/cover no-repeat;display:grid;place-items:center;color:#4A5B56;font-size:.85rem;text-align:center;padding:.5rem}
.eb-img .quadro.tem{border-style:solid;border-color:transparent}
.eb-img .acoes{display:flex;gap:.3rem;flex-wrap:wrap}
.eb-img .acoes label,.eb-img .acoes button,.eb-bt{height:30px;display:inline-flex;align-items:center;padding:0 .6rem;border-radius:6px;border:1px solid #C9D6D2;background:#fff;color:#0E1110;font:500 .8rem var(--sans);cursor:pointer;margin:0}
.eb-img .acoes label:hover,.eb-img .acoes button:hover,.eb-bt:hover{border-color:#1CA68D;color:#0F7A66}
.eb-add{display:flex;justify-content:center;margin:.1rem 0 .3rem;position:relative}
.eb-add>button{width:30px;height:30px;border-radius:50%;border:1px solid #9FB5AF;background:#fff;color:#0F7A66;font:600 1.1rem/1 var(--sans);cursor:pointer;opacity:.55}
.eb-add>button:hover,.eb-add.aberta>button{opacity:1;background:#1CA68D;color:#fff;border-color:#1CA68D}
.eb-paleta{display:none;position:absolute;top:36px;z-index:6;background:#0E1110;border:1px solid #2A3835;border-radius:10px;padding:.4rem;grid-template-columns:repeat(4,1fr);gap:.3rem;width:min(460px,90vw);box-shadow:0 14px 40px rgba(0,0,0,.45)}
.eb-add.aberta .eb-paleta{display:grid}
.eb-paleta button{display:grid;gap:.2rem;justify-items:center;padding:.6rem .3rem;border-radius:8px;border:1px solid transparent;background:transparent;color:#EAF2EF;font:500 .78rem var(--sans);cursor:pointer}
.eb-paleta button b{font-size:1.2rem;color:#A0D9CE}
.eb-paleta button:hover{background:rgba(28,166,141,.2);border-color:rgba(28,166,141,.5)}
.eb-video-prev .player-midia{max-width:420px;margin:.6rem auto 0}
.eb-sep-prev{height:1px;background:#D5E0DD;margin:.8rem 0}
.eb-botao-prev{margin:.4rem 0 0}
.eb-botao-prev span{display:inline-block;padding:.7rem 1.3rem;border-radius:999px;background:#1CA68D;color:#06130F;font-weight:600}
.eb-lado{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;align-items:center}
.eb-lado.img-dir .eb-img{order:2}
.eb-citacao{border-left:3px solid #1CA68D;padding-left:1rem}
.eb-citacao .eb-edit{font:500 1.35rem/1.4 var(--disp)}
@media (max-width:700px){.eb-lado{grid-template-columns:1fr}.eb-imgs{grid-template-columns:1fr}}`;

  function editorBlocos(raiz, iniciais, ops) {
    ops = ops || {};
    if (!document.getElementById("eb-css")) { const st = document.createElement("style"); st.id = "eb-css"; st.textContent = CSS; document.head.appendChild(st); }
    raiz.classList.add("eb");
    raiz.innerHTML =
      '<div class="eb-barra" role="toolbar" aria-label="Formatação do texto" data-inativa>' +
        '<select data-acao="estilo" aria-label="Estilo do parágrafo"><option value="p">Parágrafo</option><option value="h2">Título</option><option value="h3">Subtítulo</option><option value="blockquote">Recuo</option></select>' +
        '<span class="sep"></span>' +
        '<button type="button" data-rico data-cmd="bold" title="Negrito (Ctrl+B)"><b>B</b></button>' +
        '<button type="button" data-rico data-cmd="italic" title="Itálico (Ctrl+I)"><i>I</i></button>' +
        '<button type="button" data-rico data-cmd="underline" title="Sublinhado (Ctrl+U)"><u>U</u></button>' +
        '<button type="button" data-rico data-cmd="strikeThrough" title="Riscado"><s>S</s></button>' +
        '<span class="sep"></span>' +
        '<button type="button" data-rico data-acao="link" title="Inserir link">🔗 Link</button>' +
        '<button type="button" data-rico data-cmd="unlink" title="Remover link">Tirar link</button>' +
        '<span class="sep"></span>' +
        '<button type="button" data-rico data-cmd="insertUnorderedList" title="Lista com marcadores">• Lista</button>' +
        '<button type="button" data-rico data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>' +
        '<span class="sep"></span>' +
        '<select data-acao="cor" aria-label="Cor do texto selecionado"><option value="">Cor do texto…</option><option value="-">Padrão</option><option value="cor-marca">Turquesa MCI</option><option value="cor-menta">Menta</option><option value="cor-lima">Verde-lima</option><option value="cor-escura">Preto</option></select>' +
        '<button type="button" data-rico data-acao="span" data-cls="manuscrita" title="Trecho na fonte manuscrita">✍ Manuscrita</button>' +
        '<button type="button" data-rico data-acao="span" data-cls="maior" title="Trecho maior">A+</button>' +
        '<button type="button" data-rico data-acao="limpar" title="Tirar a formatação do trecho">Limpar</button>' +
        '<span class="sep"></span>' +
        '<button type="button" data-rico data-cmd="undo" title="Desfazer (Ctrl+Z)">↶</button>' +
        '<button type="button" data-rico data-cmd="redo" title="Refazer">↷</button>' +
        '<span class="dica">Clique em um texto para formatar</span>' +
      '</div><div class="eb-canvas"><div class="eb-pagina"></div></div>';
    const barra = raiz.querySelector(".eb-barra"), pagina = raiz.querySelector(".eb-pagina");
    let ativo = null; // último campo de texto rico com foco

    // ---------- Barra de formatação
    barra.addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); }); // mantém a seleção
    barra.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || !ativo) return;
      ativo.focus();
      if (b.dataset.cmd) { document.execCommand(b.dataset.cmd, false, null); return; }
      if (b.dataset.acao === "link") {
        if (selecaoVazia()) return aviso("Selecione o trecho que vai virar link.");
        const salvo = guardarSelecao();
        const u = prompt("Cole o link (https://…)");
        restaurarSelecao(salvo);
        const ok = urlSegura(u && (/^(https?:|mailto:)/i.test(u.trim()) ? u.trim() : "https://" + u.trim()));
        if (ok) document.execCommand("createLink", false, ok);
        return;
      }
      if (b.dataset.acao === "span") return envolver(b.dataset.cls);
      if (b.dataset.acao === "limpar") return limparTrecho();
    });
    barra.querySelector('[data-acao="estilo"]').addEventListener("change", e => {
      if (!ativo) return; ativo.focus(); document.execCommand("formatBlock", false, "<" + e.target.value + ">");
    });
    barra.querySelector('[data-acao="cor"]').addEventListener("change", e => {
      const v = e.target.value; e.target.value = ""; if (!ativo || !v) return;
      ativo.focus(); envolver(v === "-" ? "" : v, true);
    });
    const selecaoVazia = () => { const s = getSelection(); return !s.rangeCount || s.isCollapsed; };
    const guardarSelecao = () => { const s = getSelection(); return s.rangeCount ? s.getRangeAt(0).cloneRange() : null; };
    const restaurarSelecao = r => { if (!r) return; const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    const desembrulhar = el => { const p = el.parentNode; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); };
    function envolver(cls, eCor) {
      if (selecaoVazia()) return aviso("Selecione o trecho primeiro.");
      const s = getSelection(), r = s.getRangeAt(0);
      if (!ativo.contains(r.commonAncestorContainer)) return;
      const frag = r.extractContents();
      if (eCor) frag.querySelectorAll('span[class^="cor-"],span[class*=" cor-"]').forEach(desembrulhar);
      if (!cls) { r.insertNode(frag); return; }
      const sp = document.createElement("span"); sp.className = cls; sp.appendChild(frag); r.insertNode(sp);
      s.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(sp); s.addRange(nr);
    }
    function limparTrecho() {
      if (selecaoVazia()) return aviso("Selecione o trecho primeiro.");
      document.execCommand("removeFormat", false, null); document.execCommand("unlink", false, null);
      const s = getSelection(), r = s.getRangeAt(0), texto = r.toString();
      r.deleteContents(); r.insertNode(document.createTextNode(texto));
    }
    function aviso(m) { (ops.toast || alert)(m); }

    // Campo de texto rico (texto, imagem + texto) e campo simples (títulos, citações)
    function campoRico(html, vazio) {
      const d = document.createElement("div"); d.className = "eb-edit"; d.contentEditable = "true"; d.dataset.rico = "1";
      d.dataset.vazio = vazio || "Escreva aqui…"; d.innerHTML = limparHtml(html) || "";
      d.addEventListener("focus", () => { ativo = d; barra.removeAttribute("data-inativa"); });
      d.addEventListener("paste", e => {
        e.preventDefault();
        const cd = e.clipboardData, h = cd.getData("text/html"), t = cd.getData("text/plain");
        const limpo = h ? limparHtml(h) : String(t || "").split(/\n{2,}/).map(x => "<p>" + esc(x).replace(/\n/g, "<br>") + "</p>").join("");
        document.execCommand("insertHTML", false, limpo);
      });
      d.addEventListener("keydown", e => { if (e.key === "Enter" && !d.innerHTML.trim()) { document.execCommand("formatBlock", false, "<p>"); } });
      return d;
    }
    function campoSimples(tag, texto, vazio) {
      const d = document.createElement(tag); d.className = "eb-edit"; d.contentEditable = "true"; d.dataset.vazio = vazio || "";
      d.textContent = texto || "";
      d.addEventListener("focus", () => { ativo = null; barra.setAttribute("data-inativa", ""); });
      d.addEventListener("paste", e => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData.getData("text/plain") || "").replace(/\s+/g, " ")); });
      d.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });
      return d;
    }
    const sel = (nome, opcoes, valor, rot) => '<select data-op="' + nome + '" title="' + esc(rot) + '">' + opcoes.map(o => '<option value="' + o[0] + '"' + ((valor || opcoes[0][0]) === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>";
    const AL = [["esq", "⇤ Esquerda"], ["centro", "↔ Centro"], ["dir", "⇥ Direita"]];

    // Quadro de imagem: enviar arquivo, colar link, legenda, remover
    function quadroImagem(item, comLegenda) {
      const w = document.createElement("div"); w.className = "eb-img";
      w.innerHTML = '<div class="quadro">Sem imagem<br>Envie um arquivo ou cole um link</div><div class="acoes"><label>Enviar imagem<input type="file" accept="image/*" hidden></label><button type="button" data-l>Colar link</button><button type="button" data-x>Remover</button></div>' +
        (comLegenda ? '<input class="leg" placeholder="Legenda (opcional)" value="' + esc(item.legenda || "") + '" style="background:#fff;color:#0E1110;border:1px solid #C9D6D2;border-radius:6px;padding:.45rem .6rem;font:400 .88rem var(--sans)">' : "");
      const q = w.querySelector(".quadro");
      const define = u => { w.dataset.url = u || ""; q.classList.toggle("tem", !!u); q.style.backgroundImage = u ? "url('" + u.replace(/'/g, "%27") + "')" : "none"; q.innerHTML = u ? "" : "Sem imagem<br>Envie um arquivo ou cole um link"; };
      define(urlSegura(item.url));
      w.querySelector("input[type=file]").addEventListener("change", async ev => {
        q.textContent = "Enviando…"; const u = ops.enviarImagem ? await ops.enviarImagem(ev.target.files[0]) : null; define(u || w.dataset.url);
      });
      w.querySelector("[data-l]").onclick = () => { const u = prompt("Cole o link da imagem (https://…)"); if (u && urlSegura(u)) define(urlSegura(u)); };
      w.querySelector("[data-x]").onclick = () => define("");
      return w;
    }

    // ---------- Blocos
    function criarBloco(b) {
      const el = document.createElement("div"); el.className = "eb-bloco"; el.dataset.tipo = b.tipo;
      const ctrl = document.createElement("div"); ctrl.className = "eb-ctrl";
      let opcoes = "";
      if (b.tipo === "texto") opcoes = sel("alinhar", AL, b.alinhar, "Alinhamento") + sel("fonte", [["padrao", "Fonte do texto"], ["titulos", "Fonte dos títulos"], ["manuscrita", "Manuscrita"]], b.fonte, "Fonte do bloco") + sel("tamanho", [["normal", "Tamanho normal"], ["grande", "Texto grande"]], b.tamanho, "Tamanho") + sel("fundo", [["nenhum", "Sem fundo"], ["escuro", "Fundo preto"], ["marca", "Fundo turquesa"]], b.fundo, "Fundo do bloco");
      if (b.tipo === "titulo") opcoes = sel("nivel", [["2", "Título grande"], ["3", "Subtítulo"]], String(b.nivel || 2), "Tamanho do título") + sel("alinhar", AL, b.alinhar, "Alinhamento") + sel("fonte", [["padrao", "Fonte dos títulos"], ["manuscrita", "Manuscrita"]], b.fonte, "Fonte");
      if (b.tipo === "imagem") opcoes = sel("largura", [["texto", "Largura do texto"], ["larga", "Mais larga"], ["cheia", "Tela inteira"]], b.largura, "Largura da imagem") + '<button type="button" data-mais>+ Imagem ao lado</button>';
      if (b.tipo === "lado") opcoes = sel("lado", [["esq", "Imagem à esquerda"], ["dir", "Imagem à direita"]], b.lado, "Posição da imagem");
      if (b.tipo === "botao") opcoes = sel("alinhar", AL, b.alinhar, "Alinhamento");
      ctrl.innerHTML = '<span class="nome">' + esc(NOME[b.tipo] || b.tipo) + "</span>" + opcoes + '<span class="esp"></span><button type="button" data-m="cima" title="Subir">↑</button><button type="button" data-m="baixo" title="Descer">↓</button><button type="button" data-m="dup">Duplicar</button><button type="button" class="del" data-m="del">Excluir</button>';
      el.appendChild(ctrl);
      const corpo = document.createElement("div"); corpo.className = "eb-corpo"; el.appendChild(corpo);

      if (b.tipo === "texto") {
        const ed = campoRico(b.html, "Escreva o texto. Use a barra acima para negrito, links, listas e cores."); ed.classList.add("b-texto"); corpo.appendChild(ed);
        const aplica = () => {
          const v = n => ctrl.querySelector('[data-op="' + n + '"]').value;
          ed.className = "eb-edit b-texto" + (v("alinhar") === "centro" ? " al-centro" : v("alinhar") === "dir" ? " al-dir" : "") + (v("fonte") === "titulos" ? " f-titulos" : v("fonte") === "manuscrita" ? " f-hand" : "") + (v("tamanho") === "grande" ? " t-grande" : "") + (v("fundo") === "escuro" ? " fundo-escuro" : v("fundo") === "marca" ? " fundo-marca" : "");
        };
        ctrl.addEventListener("change", aplica); aplica();
      }
      if (b.tipo === "titulo") {
        const t = campoSimples("h2", b.texto, "Título da seção"); corpo.appendChild(t);
        const aplica = () => {
          const v = n => ctrl.querySelector('[data-op="' + n + '"]').value;
          t.className = "eb-edit b-titulo" + (v("alinhar") === "centro" ? " al-centro" : v("alinhar") === "dir" ? " al-dir" : "") + (v("fonte") === "manuscrita" ? " f-hand" : "");
          t.style.fontSize = v("nivel") === "3" ? "1.2rem" : "";
        };
        ctrl.addEventListener("change", aplica); aplica();
      }
      if (b.tipo === "imagem") {
        const g = document.createElement("div"); g.className = "eb-imgs"; corpo.appendChild(g);
        const itens = (b.itens && b.itens.length ? b.itens : [{}]).slice(0, 3);
        const conta = () => { g.style.setProperty("--n", g.children.length); ctrl.querySelector("[data-mais]").hidden = g.children.length >= 3; };
        const add = it => { const q = quadroImagem(it, true); q.querySelector("[data-x]").addEventListener("click", () => { if (g.children.length > 1) { q.remove(); conta(); } }); g.appendChild(q); conta(); };
        itens.forEach(add);
        ctrl.querySelector("[data-mais]").onclick = () => add({});
      }
      if (b.tipo === "lado") {
        const g = document.createElement("div"); g.className = "eb-lado" + (b.lado === "dir" ? " img-dir" : "");
        g.appendChild(quadroImagem({ url: b.url }, false));
        const ed = campoRico(b.html, "Texto ao lado da imagem"); ed.classList.add("b-texto"); g.appendChild(ed);
        corpo.appendChild(g);
        ctrl.addEventListener("change", () => g.classList.toggle("img-dir", ctrl.querySelector('[data-op="lado"]').value === "dir"));
      }
      if (b.tipo === "video") {
        corpo.innerHTML = '<div class="eb-campos"><label>Link do vídeo (YouTube, Instagram, TikTok, Facebook) ou arquivo MP4</label><input data-c="url" value="' + esc(b.url || "") + '" placeholder="https://www.youtube.com/watch?v=…"><div style="display:flex;gap:.4rem;flex-wrap:wrap"><label class="eb-bt">Enviar arquivo de vídeo<input type="file" accept="video/mp4,video/quicktime,video/webm" hidden></label></div><input data-c="legenda" value="' + esc(b.legenda || "") + '" placeholder="Legenda (opcional)"></div><div class="eb-video-prev"></div>';
        const u = corpo.querySelector('[data-c="url"]'), pv = corpo.querySelector(".eb-video-prev");
        const mostra = () => { pv.innerHTML = ""; if (emb(u.value).tipo) pv.appendChild(player(u.value, { limpo: true })); else if (u.value) pv.innerHTML = '<p style="color:#B23A2F;font-size:.85rem">Link não reconhecido. Use o link do vídeo, não o do perfil.</p>'; };
        u.addEventListener("change", mostra); mostra();
        corpo.querySelector("input[type=file]").addEventListener("change", async ev => { pv.textContent = "Enviando vídeo…"; const url = ops.enviarVideo ? await ops.enviarVideo(ev.target.files[0]) : null; if (url) u.value = url; mostra(); });
      }
      if (b.tipo === "citacao") {
        const w = document.createElement("div"); w.className = "eb-citacao";
        w.appendChild(campoSimples("div", b.texto, "Frase em destaque"));
        w.insertAdjacentHTML("beforeend", '<div class="eb-campos"><input data-c="autor" value="' + esc(b.autor || "") + '" placeholder="Quem disse (opcional)"></div>');
        corpo.appendChild(w);
      }
      if (b.tipo === "botao") {
        corpo.innerHTML = '<div class="eb-campos" style="grid-template-columns:1fr 1.4fr"><input data-c="rotulo" value="' + esc(b.rotulo || "") + '" placeholder="Texto do botão (ex.: Ver na loja)"><input data-c="url" value="' + esc(b.url || "") + '" placeholder="https://www.mci.tv/…"></div><div class="eb-botao-prev"><span></span></div>';
        const r = corpo.querySelector('[data-c="rotulo"]'), pv = corpo.querySelector(".eb-botao-prev"), al = () => ctrl.querySelector('[data-op="alinhar"]').value;
        const mostra = () => { pv.firstChild.textContent = r.value || "Texto do botão"; pv.style.textAlign = al() === "centro" ? "center" : al() === "dir" ? "right" : "left"; };
        r.addEventListener("input", mostra); ctrl.addEventListener("change", mostra); mostra();
      }
      if (b.tipo === "separador") corpo.innerHTML = '<div class="eb-sep-prev"></div>';

      ctrl.addEventListener("click", e => {
        const m = e.target.closest("[data-m]"); if (!m) return;
        const add = el.nextElementSibling; // botão "+" que acompanha o bloco
        if (m.dataset.m === "cima" && el.previousElementSibling && el.previousElementSibling.previousElementSibling) { const alvo = el.previousElementSibling.previousElementSibling; pagina.insertBefore(el, alvo); pagina.insertBefore(add, alvo); }
        if (m.dataset.m === "baixo" && add.nextElementSibling) { const depois = add.nextElementSibling.nextElementSibling; pagina.insertBefore(el, depois.nextSibling); pagina.insertBefore(add, el.nextSibling); }
        if (m.dataset.m === "dup") { const [nb, na] = par(lerBloco(el) || { tipo: b.tipo }); pagina.insertBefore(na, add.nextSibling); pagina.insertBefore(nb, na); }
        if (m.dataset.m === "del") { if (!confirm("Excluir este bloco?")) return; add.remove(); el.remove(); if (!pagina.querySelector(".eb-bloco")) inserir(pagina.firstElementChild, { tipo: "texto", html: "" }); }
      });
      return el;
    }
    function botaoAdd() {
      const a = document.createElement("div"); a.className = "eb-add";
      a.innerHTML = '<button type="button" title="Adicionar bloco aqui" aria-label="Adicionar bloco">+</button><div class="eb-paleta">' + TIPOS.map(t => '<button type="button" data-t="' + t[0] + '"><b>' + t[2] + "</b>" + t[1] + "</button>").join("") + "</div>";
      a.firstChild.onclick = () => { pagina.querySelectorAll(".eb-add.aberta").forEach(x => x !== a && x.classList.remove("aberta")); a.classList.toggle("aberta"); };
      a.querySelector(".eb-paleta").addEventListener("click", e => {
        const t = e.target.closest("[data-t]"); if (!t) return; a.classList.remove("aberta");
        const novo = inserir(a, { tipo: t.dataset.t });
        const foco = novo.querySelector(".eb-edit, input"); if (foco) foco.focus();
      });
      return a;
    }
    const par = b => [criarBloco(b), botaoAdd()];
    function inserir(depoisDe, b) { const [nb, na] = par(b); pagina.insertBefore(nb, depoisDe ? depoisDe.nextSibling : pagina.firstChild); pagina.insertBefore(na, nb.nextSibling); return nb; }

    function lerBloco(el) {
      const t = el.dataset.tipo, c = el.querySelector(".eb-corpo"), op = n => { const x = el.querySelector('.eb-ctrl [data-op="' + n + '"]'); return x ? x.value : undefined; };
      const campo = n => { const x = c.querySelector('[data-c="' + n + '"]'); return x ? x.value.trim() : ""; };
      if (t === "texto") { const html = limparHtml(c.querySelector(".eb-edit").innerHTML); return html.replace(/<[^>]+>/g, "").trim() ? { tipo: t, html, alinhar: op("alinhar"), fonte: op("fonte"), tamanho: op("tamanho"), fundo: op("fundo") } : null; }
      if (t === "titulo") { const tx = c.querySelector(".eb-edit").textContent.trim(); return tx ? { tipo: t, texto: tx, nivel: Number(op("nivel")) || 2, alinhar: op("alinhar"), fonte: op("fonte") } : null; }
      if (t === "imagem") { const itens = [...c.querySelectorAll(".eb-img")].map(w => ({ url: w.dataset.url || "", legenda: (w.querySelector(".leg") || {}).value || "" })).filter(i => i.url); return itens.length ? { tipo: t, largura: op("largura"), itens } : null; }
      if (t === "lado") { const w = c.querySelector(".eb-img"); return { tipo: t, url: w.dataset.url || "", lado: op("lado"), html: limparHtml(c.querySelector(".eb-edit").innerHTML) }; }
      if (t === "video") return campo("url") ? { tipo: t, url: campo("url"), legenda: campo("legenda") } : null;
      if (t === "citacao") { const tx = c.querySelector(".eb-edit").textContent.trim(); return tx ? { tipo: t, texto: tx, autor: campo("autor") } : null; }
      if (t === "botao") return campo("rotulo") && campo("url") ? { tipo: t, rotulo: campo("rotulo"), url: campo("url"), alinhar: op("alinhar") } : null;
      if (t === "separador") return { tipo: t };
      return null;
    }

    // Monta o editor
    pagina.appendChild(botaoAdd());
    let ult = pagina.firstElementChild;
    const lista = (iniciais && iniciais.length ? iniciais : [{ tipo: "texto", html: "" }]);
    lista.forEach(b => { const nb = inserir(ult, b); ult = nb.nextElementSibling; });
    document.addEventListener("click", e => { if (!e.target.closest(".eb-add")) pagina.querySelectorAll(".eb-add.aberta").forEach(x => x.classList.remove("aberta")); });

    return {
      obter: () => [...pagina.querySelectorAll(":scope > .eb-bloco")].map(lerBloco).filter(Boolean),
      vazio: () => ![...pagina.querySelectorAll(":scope > .eb-bloco")].map(lerBloco).filter(Boolean).length
    };
  }

  window.MCI.editorBlocos = editorBlocos;
})();
