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
  function emb(url) {
    const u = String(url || "").trim();
    let m;
    if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/i)))
      return { rede: "YouTube", src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0", vertical: /shorts\//i.test(u) };
    if ((m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i)))
      return { rede: "Instagram", src: "https://www.instagram.com/" + (m[1].toLowerCase().startsWith("reel") ? "reel" : m[1]) + "/" + m[2] + "/embed", vertical: true };
    if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/i)))
      return { rede: "TikTok", src: "https://www.tiktok.com/embed/v2/" + m[1], vertical: true };
    if (/facebook\.com|fb\.watch/i.test(u))
      return { rede: "Facebook", src: "https://www.facebook.com/plugins/video.php?show_text=false&href=" + encodeURIComponent(u), vertical: /reel/i.test(u) };
    return { rede: "", src: "", vertical: false };
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

  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);

  window.MCI = { C, db, FRENTES, esc, urlSegura, emb, menu, dataBR, paragrafos };
})();
