import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

/* ===== Constantes ===== */
const VERSAO = "5";
const DOMINIO_LOGIN = "npm-solano.com"; // contas próprias do NPM (separadas do rpcontrol)
const SETORES = ["Sul", "Norte", "Centro", "Leste"];
const NIVEIS = [["iniciante", "Iniciante"], ["avancado", "Avançado"], ["setorizar", "Setorizar"]];
const NIVEL_NOME = Object.fromEntries(NIVEIS);

/* ===== Utilidades ===== */
const iso = d => { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const today = () => iso(new Date());
const diasDesde = s => { if (!s) return null; const p = x => { const [y, m, d] = String(x).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); }; return Math.max(0, Math.round((p(today()) - p(s)) / 864e5)); };
const txtDias = n => n === null ? "sem data" : n === 0 ? "entrou hoje" : n === 1 ? "1 dia" : n + " dias";
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtD = s => { if (!s) return ""; const [y, m, d] = String(s).slice(0, 10).split("-"); return d + "/" + m + "/" + y; };
const fmtDH = s => { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };
function slugUsuario(nome) {
  return String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "").replace(/\.{2,}/g, ".").replace(/^[.\-_]+|[.\-_]+$/g, "");
}
const emailDe = nome => slugUsuario(nome) + "@" + DOMINIO_LOGIN;
const busca = s => slugUsuario(s).replace(/\./g, " ");

/* ===== Supabase ===== */
const CFG = window.NPM_CONFIG || {};
const url = (String(CFG.SUPABASE_URL || "").trim().match(/^https?:\/\/[^\/\s]+/) || [""])[0];
const sb = url && CFG.SUPABASE_ANON_KEY ? createClient(url, String(CFG.SUPABASE_ANON_KEY).trim()) : null;

let S = { efetivos: [], usuarios: [] };
let EU = { id: null, nome: "", papel: "", avatar: "" };
async function carregar() {
  const [ef, us] = await Promise.all([
    sb.from("npm_efetivos").select("*").order("qra").range(0, 4999),
    sb.from("npm_usuarios").select("*").order("criado_em")
  ]);
  if (ef.error) throw ef.error; if (us.error) throw us.error;
  S = { efetivos: ef.data, usuarios: us.data };
  const me = S.usuarios.find(u => u.user_id === EU.id); if (me) { EU.nome = me.nome; EU.papel = me.papel; EU.avatar = me.avatar || ""; }
}

/* ===== Status / toast ===== */
function setStatus(t, c) { const el = document.getElementById("status"); if (el) { el.textContent = t; el.style.color = c || ""; } }
function toast(t) { const el = document.getElementById("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2200); }
async function run(promise) {
  setStatus("Salvando…");
  const { error } = await promise;
  if (error) {
    setStatus("Erro ao salvar", "#e06a5a"); toast("Erro: " + error.message);
    try { await carregar(); } catch (e) { }
    render(); return false;
  }
  setStatus("✓ Salvo", "#5fbf7a"); return true;
}

/* ===== Estado de tela ===== */
const TABS = [["efetivos", "Efetivos"], ["enviados", "Enviados"], ["avaliacao", "Avaliação"]];
const ICON = {
  efetivos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  enviados: '<path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 4v16"/>',
  avaliacao: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 11l1.5 1.5L13 10M9 16h6"/>'
};
const TAB_OK = t => t === "perfil" || TABS.some(x => x[0] === t);
let tab = (location.hash || "").slice(1); if (!TAB_OK(tab)) tab = "efetivos";
const ui = { temResp: null, fase: "carregando", modo: "entrar", erroLogin: "", filtro: "", q: "", envSetor: "", cad: null };
function go(t) { if (t === tab) { window.scrollTo({ top: 0, behavior: "smooth" }); return; } tab = t; try { history.replaceState(null, "", "#" + t); } catch (e) { } render(); window.scrollTo(0, 0); }
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TAB_OK(t)) { tab = t; render(); } });
const isAdmin = () => EU.papel === "admin";

/* ===== Telas ===== */
const avatarUrl = () => EU.avatar || "logo.jpg";
function header() {
  return `<header><div class="top"><button class="hperfil" data-tab="perfil" aria-label="Abrir perfil"><div class="avatar" style="background-image:url('${avatarUrl()}')"></div>
  <div style="min-width:0"><h1>${esc(EU.nome)}</h1><div class="rank-t">MAJ-GEN</div><div class="unit">Exército de Solano</div><div id="status"></div></div></button>
  <button class="hbtn" data-novo aria-label="Cadastrar efetivo"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div></header>
  <nav id="nav">${TABS.map(([k, n]) => `<button class="${k === tab ? "on" : ""}" data-tab="${k}"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${n}</button>`).join("")}</nav>`;
}
function vLogin() {
  const podeCriar = ui.temResp === false;
  const criar = podeCriar && ui.modo === "criar";
  return `<div class="login"><img class="logo-login" src="logo.jpg" alt="NPM · Núcleo Preparatório Militar">
  ${podeCriar ? `<div class="seg" style="margin-top:16px"><button class="${!criar ? "on" : ""}" data-modo="entrar">Entrar</button><button class="${criar ? "on" : ""}" data-modo="criar">Criar conta</button></div>` : ""}
  <form class="card" id="loginForm" style="margin-top:${podeCriar ? 0 : 16}px"><label>QRA (nome no jogo)</label><input id="lNome" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" required>
  <label>Senha</label><input id="lSenha" type="password" autocomplete="${criar ? "new-password" : "current-password"}" enterkeyhint="${criar ? "next" : "go"}" required>
  ${criar ? `<label>Repita a senha</label><input id="lSenha2" type="password" autocomplete="new-password" enterkeyhint="go" required>` : ""}
  <button class="btn" type="submit">${criar ? "Criar conta do responsável" : "Entrar"}</button><div class="err" id="lErr">${esc(ui.erroLogin)}</div>
  <div class="sub">${criar ? "Esta será a única conta do NPM. O QRA aparece no cabeçalho do painel." : "Acesso do responsável pelo NPM."}</div></form></div>`;
}
function vPendente() {
  return `<div class="login"><div class="avatar"></div><div class="card" style="margin-top:20px"><h2>Aguardando aprovação</h2><p>Sua conta <b>${esc(EU.nome)}</b> foi criada. Peça para um administrador do NPM aprovar na aba <b>Equipe</b>.</p><button class="btn" data-verificar>Já fui aprovado</button><button class="btn sec" data-sair>Sair</button></div></div>`;
}
function vNegado() { return `<div class="login"><div class="avatar"></div><div class="card" style="margin-top:20px"><h2>Sem acesso</h2><p class="sub">${esc(ui.erro || "Esta conta não é do NPM.")}</p><button class="btn sec" data-sair>Sair</button></div></div>`; }
function vErro() { return `<div class="login"><div class="card"><h2>Erro ao carregar</h2><p class="sub">${esc(ui.erro)}</p><p class="sub">Confira se o script <b>supabase/schema.sql</b> foi rodado no Supabase.</p><button class="btn" data-recarregar>Tentar de novo</button><button class="btn sec" data-sair>Sair</button></div></div>`; }
function vConfig() { return `<div class="login"><div class="card"><h2>Configuração</h2><p>Preencha o <b>config.js</b> com a URL e a chave publishable do Supabase.</p></div></div>`; }

function efCard(x, enviado) {
  const meta = [x.dc ? "DC: " + esc(x.dc) : "", x.data_entrada ? "Entrada " + fmtD(x.data_entrada) : "", x.recrutado_por ? "Recrutado por " + esc(x.recrutado_por) : ""].filter(Boolean).join(" · ");
  let h = `<div class="efcard"><div class="top2"><div class="nm"><b>${esc(x.qra)}</b>${meta ? `<div class="meta">${meta}</div>` : ""}</div><button class="ed" data-editar="${x.id}" aria-label="Editar"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></button></div>`;
  if (x.obs) h += `<div class="sub" style="margin-top:6px">${esc(x.obs)}</div>`;
  if (enviado) h += `<div class="aviso env">Enviado ao <b>Setor ${esc(x.setor_destino)}</b> em ${fmtDH(x.setorizado_em)}</div>`;
  else {
    h += `<div class="niveis">${NIVEIS.map(([k, n]) => `<button class="${k} ${x.nivel === k ? "on" : ""}" data-nivel="${x.id}|${k}">${n}</button>`).join("")}</div>`;
    if (x.nivel === "setorizar") h += `<div class="aviso esp">Aguardando o TEN-GEN escolher o setor.</div>`;
  }
  return h + `</div>`;
}
function vEfetivos() {
  const ativos = S.efetivos.filter(x => !x.setor_destino);
  const cont = k => ativos.filter(x => x.nivel === k).length;
  const q = busca(ui.q);
  const lista = ativos.filter(x => (!ui.filtro || x.nivel === ui.filtro) && (!q || busca(x.qra).includes(q) || String(x.dc).toLowerCase().includes(q) || busca(x.recrutado_por).includes(q)));
  const ordem = { setorizar: 0, avancado: 1, iniciante: 2 };
  lista.sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || a.qra.localeCompare(b.qra));
  let h = `<div class="card"><input id="busca" type="search" placeholder="Buscar por nome, DC ou recrutador" value="${esc(ui.q)}" enterkeyhint="search" autocapitalize="none" autocorrect="off">
  <div class="resumo cnt3"><button class="rs ${!ui.filtro ? "on" : ""}" data-filtro=""><b>${ativos.length}</b><span>Todos</span></button>${NIVEIS.map(([k, n]) => `<button class="rs ${ui.filtro === k ? "on" : ""}" data-filtro="${k}"><b>${cont(k)}</b><span>${n}</span></button>`).join("")}</div></div>`;
  if (ativos.length) h += `<button class="btn discord" data-relatorio><svg viewBox="0 0 24 24"><path d="M8 7h8M8 11h8M8 15h5"/><rect x="4" y="3" width="16" height="18" rx="3"/></svg>Relatório do dia para o Discord</button>`;
  h += `<div class="card" style="margin-top:12px"><h2>${ui.filtro ? NIVEL_NOME[ui.filtro] : "Efetivos em treinamento"} (${lista.length})</h2>`;
  if (!ativos.length) h += `<div class="empty-msg">Nenhum efetivo cadastrado.<br>Toque no <b>+</b> lá em cima para cadastrar.</div>`;
  else if (!lista.length) h += `<div class="empty-msg">Nenhum efetivo encontrado.</div>`;
  lista.forEach(x => h += efCard(x, false));
  return h + `</div>`;
}
function textoRelatorio() {
  const ativos = S.efetivos.filter(x => !x.setor_destino && (!ui.filtro || x.nivel === ui.filtro));
  const linha = x => `• ${x.qra} - ${x.dc ? x.dc : "sem DC"} - ${txtDias(diasDesde(x.data_entrada))}`;
  const porNome = (a, b) => a.qra.localeCompare(b.qra);
  let s = `**📋 RELATÓRIO N.P.M. · ${fmtD(today())}**\n**Núcleo Preparatório Militar** · Exército de Solano\n`;
  s += `${ui.filtro ? NIVEL_NOME[ui.filtro] : "Efetivos em treinamento"}: **${ativos.length}**\n`;
  if (!ativos.length) s += "\nNenhum efetivo.\n";
  else if (ui.filtro) { s += "\n"; ativos.sort(porNome).forEach(x => s += linha(x) + "\n"); }
  else {
    const ic = { setorizar: "🟡", avancado: "🟢", iniciante: "⚪" };
    ["setorizar", "avancado", "iniciante"].forEach(k => {
      const l = ativos.filter(x => x.nivel === k).sort(porNome); if (!l.length) return;
      s += `\n${ic[k]} **${NIVEL_NOME[k]}** (${l.length})\n`; l.forEach(x => s += linha(x) + "\n");
    });
  }
  s += `\n— ${EU.nome} · MAJ-GEN · N.P.M.`;
  return s;
}
function vEnviados() {
  const env = S.efetivos.filter(x => x.setor_destino);
  const lista = env.filter(x => !ui.envSetor || x.setor_destino === ui.envSetor).sort((a, b) => String(b.setorizado_em).localeCompare(String(a.setorizado_em)));
  let h = `<div class="card"><div class="resumo cnt3" style="margin-top:0">${SETORES.map(s => `<button class="rs ${ui.envSetor === s ? "on" : ""}" data-envsetor="${s}"><b>${env.filter(x => x.setor_destino === s).length}</b><span>${s}</span></button>`).join("")}</div>
  <div class="sub" style="text-align:center;margin-top:8px">Efetivos que o TEN-GEN já enviou para um setor</div></div>`;
  h += `<div class="card"><h2>${ui.envSetor ? "Setor " + ui.envSetor : "Enviados"} (${lista.length})</h2>`;
  if (!lista.length) h += `<div class="empty-msg">Ninguém enviado ainda.</div>`;
  lista.forEach(x => h += efCard(x, true));
  return h + `</div>`;
}
function vAvaliacao() {
  return `<div class="card"><h2>Avaliação</h2><div class="empty-msg">Em breve.<br><span class="sub">As perguntas da avaliação dos efetivos vão aparecer aqui.</span></div></div>`;
}
function vPerfil() {
  return `<div class="card perfil"><div class="avatar grande" style="background-image:url('${avatarUrl()}')"></div>
  <h2 style="text-align:center;margin:12px 0 2px">${esc(EU.nome)}</h2><div class="rank-t" style="text-align:center">MAJ-GEN</div><div class="unit" style="text-align:center">Exército de Solano · N.P.M.</div>
  <label class="btn" style="display:block;text-align:center;line-height:50px;padding:0;margin-top:16px;color:#16130b">Trocar foto<input type="file" id="fotoInput" accept="image/*" hidden></label>
  ${EU.avatar ? `<button class="btn sec" data-semfoto>Usar a logo do NPM</button>` : ""}
  <div class="sub" style="text-align:center;margin-top:8px">A foto aparece no cabeçalho do painel.</div></div>
  <div class="card"><div class="sub" style="text-align:center">Versão do painel: ${VERSAO}</div><button class="btn sec" data-sair>Sair da conta</button></div>`;
}
async function trocarFoto(file) {
  if (!file || !/^image\//.test(file.type)) return toast("Escolha uma imagem");
  setStatus("Enviando foto…");
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }).catch(() => null);
  if (!img) return toast("Não consegui abrir essa imagem");
  const lado = Math.min(img.naturalWidth, img.naturalHeight), alvo = 320;
  const c = document.createElement("canvas"); c.width = c.height = alvo;
  c.getContext("2d").drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, alvo, alvo);
  const dataUrl = c.toDataURL("image/jpeg", 0.85); URL.revokeObjectURL(img.src);
  EU.avatar = dataUrl; render();
  if (await run(sb.rpc("npm_salvar_avatar", { p_avatar: dataUrl }))) toast("✓ Foto atualizada");
}

/* ===== Render ===== */
function render() {
  const root = document.getElementById("root");
  const telas = { config: vConfig, login: vLogin, pendente: vPendente, negado: vNegado, erro: vErro };
  if (telas[ui.fase]) { root.innerHTML = telas[ui.fase](); return; }
  if (ui.fase !== "pronto") { root.innerHTML = `<div class="loading">Carregando…</div>`; return; }
  const st = document.getElementById("status"); const stTxt = st ? st.textContent : "✓ Conectado", stCor = st ? st.style.color : "#5fbf7a";
  const y = window.scrollY;
  root.innerHTML = header() + `<main id="app">${{ efetivos: vEfetivos, enviados: vEnviados, avaliacao: vAvaliacao, perfil: vPerfil }[tab]()}</main>`;
  if (render.mesmaAba === tab) window.scrollTo(0, y); render.mesmaAba = tab;
  setStatus(stTxt, stCor);
}

/* ===== Modais ===== */
function openModal(html) { document.getElementById("modalBody").innerHTML = html; document.getElementById("modal").classList.add("show"); }
function closeModal() { document.getElementById("modal").classList.remove("show"); }
document.getElementById("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
let confirmOk = null;
function confirmBox(msg, ok) { confirmOk = ok; openModal(`<h2>Confirmar</h2><p>${msg}</p><div class="grid2"><button class="btn sec" data-mclose>Cancelar</button><button class="btn" data-mok>Confirmar</button></div>`); }
const X_BTN = `<button class="mx" data-mclose aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
function cadastroModal(id) {
  const x = id ? S.efetivos.find(e => e.id === id) : { qra: "", dc: "", data_entrada: today(), recrutado_por: "", obs: "", nivel: "iniciante" };
  ui.cad = { id: id || null, nivel: x.nivel };
  const enviado = !!(id && x.setor_destino);
  openModal(`<div class="mhead"><h2>${id ? "Editar efetivo" : "Cadastrar efetivo"}</h2>${X_BTN}</div>
  <label>QRA</label><input id="eQra" value="${esc(x.qra)}" placeholder="Nome no jogo" autocapitalize="words">
  <label>DC</label><input id="eDc" value="${esc(x.dc)}" placeholder="Discord" autocapitalize="none" autocorrect="off">
  <label>Data de entrada</label><input id="eData" type="date" class="data-full" value="${esc(String(x.data_entrada || today()).slice(0, 10))}">
  <label>Recrutado por</label><input id="eRec" value="${esc(x.recrutado_por)}" placeholder="Quem recrutou">
  <label>Observação</label><textarea id="eObs" placeholder="Anotações (o TEN-GEN vê na setorização)" style="font-size:16px;min-height:80px;font-family:inherit">${esc(x.obs)}</textarea>
  ${enviado ? `<div class="aviso env">Enviado ao <b>Setor ${esc(x.setor_destino)}</b> em ${fmtDH(x.setorizado_em)}</div>` : `<label>Nível</label><div class="niveis" style="margin-top:0">${NIVEIS.map(([k, n]) => `<button class="${k} ${x.nivel === k ? "on" : ""}" data-cnivel="${k}">${n}</button>`).join("")}</div>`}
  <button class="btn" data-esalvar>${id ? "Salvar alterações" : "Cadastrar"}</button>
  ${id ? `<button class="btn danger" data-eapagar="${id}">Apagar efetivo</button>` : ""}`);
}

/* ===== Ações ===== */
async function salvarEfetivo() {
  const g = id => document.getElementById(id).value.trim();
  const dados = { qra: g("eQra"), dc: g("eDc"), data_entrada: g("eData") || today(), recrutado_por: g("eRec"), obs: g("eObs") };
  if (!dados.qra) return toast("Informe o QRA");
  if (!ui.cad.id || !S.efetivos.find(e => e.id === ui.cad.id).setor_destino) dados.nivel = ui.cad.nivel;
  closeModal();
  if (ui.cad.id) {
    const x = S.efetivos.find(e => e.id === ui.cad.id); Object.assign(x, dados); render();
    if (await run(sb.from("npm_efetivos").update(dados).eq("id", x.id))) toast("✓ Efetivo atualizado");
  } else {
    const { data, error } = await sb.from("npm_efetivos").insert(dados).select().single();
    if (error) { toast("Erro: " + error.message); return; }
    S.efetivos.push(data); render(); setStatus("✓ Salvo", "#5fbf7a"); toast("✓ Efetivo cadastrado");
  }
}
async function mudarNivel(id, nivel) {
  const x = S.efetivos.find(e => e.id === id); if (!x || x.nivel === nivel) return;
  x.nivel = nivel; x.atualizado_em = new Date().toISOString(); render();
  if (await run(sb.from("npm_efetivos").update({ nivel }).eq("id", id))) toast(nivel === "setorizar" ? `✓ ${x.qra} enviado para a setorização do TEN-GEN` : `✓ ${x.qra}: ${NIVEL_NOME[nivel]}`);
}

document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
  if (d.tab) return go(d.tab);
  if (d.modo) { ui.modo = d.modo; ui.erroLogin = ""; return render(); }
  if (d.sair !== undefined) { await sb.auth.signOut(); location.reload(); return; }
  if (d.recarregar !== undefined || d.verificar !== undefined) return entrar();
  if (d.novo !== undefined) return cadastroModal();
  if (d.editar) return cadastroModal(d.editar);
  if (d.cnivel) { ui.cad.nivel = d.cnivel; t.parentNode.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === t)); return; }
  if (d.esalvar !== undefined) return salvarEfetivo();
  if (d.eapagar) { const x = S.efetivos.find(z => z.id === d.eapagar); return confirmBox(`Apagar <b>${esc(x.qra)}</b> do NPM?`, async () => { S.efetivos = S.efetivos.filter(z => z.id !== x.id); render(); if (await run(sb.from("npm_efetivos").delete().eq("id", x.id))) toast("Efetivo apagado"); }); }
  if (d.nivel) { const [id, k] = d.nivel.split("|"); return mudarNivel(id, k); }
  if (d.relatorio !== undefined) {
    openModal(`<div class="mhead"><h2>Relatório do dia</h2>${X_BTN}</div>
    <div class="sub" style="margin-bottom:8px">${ui.filtro ? "Só " + NIVEL_NOME[ui.filtro] + " (filtro atual)." : "Todos os efetivos em treinamento."} Copie e cole no Discord.</div>
    <textarea id="relTxt" readonly class="resumo-txt">${esc(textoRelatorio())}</textarea><button class="btn" data-copiarrel>Copiar relatório</button>`);
    return;
  }
  if (d.copiarrel !== undefined) {
    const el = document.getElementById("relTxt");
    try { await navigator.clipboard.writeText(el.value); toast("✓ Relatório copiado — é só colar no Discord"); closeModal(); }
    catch (er) { el.focus(); el.select(); try { document.execCommand("copy"); toast("✓ Relatório copiado"); closeModal(); } catch (e2) { toast("Selecione o texto e copie"); } }
    return;
  }
  if (d.filtro !== undefined) { ui.filtro = ui.filtro === d.filtro ? "" : d.filtro; return render(); }
  if (d.envsetor) { ui.envSetor = ui.envSetor === d.envsetor ? "" : d.envsetor; return render(); }
  if (d.semfoto !== undefined) { EU.avatar = ""; render(); if (await run(sb.rpc("npm_salvar_avatar", { p_avatar: "" }))) toast("✓ Usando a logo do NPM"); return; }
  if (d.aprovar) { const u = S.usuarios.find(z => z.user_id === d.aprovar); u.aprovado = true; render(); if (await run(sb.rpc("npm_aprovar", { p_user: u.user_id }))) toast(`✓ ${u.nome} aprovado`); return; }
  if (d.papel) { const [id, p] = d.papel.split("|"); const u = S.usuarios.find(z => z.user_id === id); u.papel = p; render(); if (await run(sb.rpc("npm_definir_papel", { p_user: id, p_papel: p }))) toast(`✓ ${u.nome}: ${p === "admin" ? "administrador" : "membro"}`); return; }
  if (d.remover) { const u = S.usuarios.find(z => z.user_id === d.remover); return confirmBox(`${u.aprovado ? "Remover" : "Recusar"} <b>${esc(u.nome)}</b> do NPM?`, async () => { S.usuarios = S.usuarios.filter(z => z.user_id !== u.user_id); render(); await run(sb.rpc("npm_remover", { p_user: u.user_id })); }); }
  if (d.mclose !== undefined) return closeModal();
  if (d.mok !== undefined) { closeModal(); const f = confirmOk; confirmOk = null; if (f) f(); return; }
});
document.addEventListener("change", e => { if (e.target.id === "fotoInput") trocarFoto(e.target.files[0]); });
document.addEventListener("input", e => {
  if (e.target.id === "busca") { ui.q = e.target.value; clearTimeout(ui._bt); ui._bt = setTimeout(() => { const pos = e.target.selectionStart; render(); const el = document.getElementById("busca"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) { } } }, 250); }
});
document.addEventListener("submit", async e => {
  if (e.target.id !== "loginForm") return; e.preventDefault();
  const nome = document.getElementById("lNome").value.trim().replace(/\s+/g, " "), senha = document.getElementById("lSenha").value;
  const err = document.getElementById("lErr");
  const falha = m => { ui.erroLogin = m; err.textContent = m; };
  if (slugUsuario(nome).length < 3) return falha("Informe o nome no jogo (pelo menos 3 letras ou números).");
  if (senha.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
  err.textContent = ui.modo === "criar" ? "Criando conta…" : "Entrando…";
  if (ui.modo === "criar") {
    if (nome.length > 40) return falha("O nome pode ter no máximo 40 caracteres.");
    if (senha !== document.getElementById("lSenha2").value) return falha("As senhas não são iguais.");
    const { data, error } = await sb.auth.signUp({ email: emailDe(nome), password: senha, options: { data: { nome_jogo: nome } } });
    if (error) return falha(/already|registered|exists/i.test(error.message) ? "Já existe uma conta com esse nome. Use Entrar." : error.message);
    if (!data.session) return falha("O Supabase está exigindo confirmação de e-mail. Desligue \"Confirm email\" nas configurações de Auth.");
    const r = await sb.rpc("npm_registrar", { p_nome: nome });
    if (r.error) { await sb.auth.signOut(); return falha(r.error.message); }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email: emailDe(nome), password: senha });
    if (error) return falha(/invalid login/i.test(error.message) ? "Nome ou senha incorretos." : error.message);
  }
  ui.erroLogin = ""; entrar();
});

/* ===== Início ===== */
async function entrar() {
  ui.fase = "carregando"; render();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return mostrarLogin();
    EU.id = session.user.id; EU.nome = (session.user.user_metadata || {}).nome_jogo || String(session.user.email || "").split("@")[0];
    if (!String(session.user.email || "").endsWith("@" + DOMINIO_LOGIN)) { ui.fase = "negado"; ui.erro = "Esta conta não é do NPM. Crie uma conta própria do NPM."; return render(); }
    let { data: sit, error } = await sb.rpc("npm_situacao");
    if (error) throw error;
    if (sit === "nenhum") { const r = await sb.rpc("npm_registrar", { p_nome: EU.nome }); if (r.error) { ui.fase = "negado"; ui.erro = r.error.message; return render(); } sit = r.data; }
    if (sit === "pendente") { ui.fase = "pendente"; return render(); }
    EU.papel = sit;
    await carregar(); ui.fase = "pronto"; render(); setStatus("✓ Conectado", "#5fbf7a");
  } catch (e) { ui.fase = "erro"; ui.erro = e.message || String(e); render(); }
}
async function boot() {
  if (!sb) { ui.fase = "config"; return render(); }
  const { data: { session } } = await sb.auth.getSession();
  if (session) entrar(); else await mostrarLogin();
}
async function mostrarLogin() {
  try { const { data, error } = await sb.rpc("npm_tem_responsavel"); ui.temResp = error ? true : !!data; } catch (e) { ui.temResp = true; }
  if (!ui.temResp) ui.modo = "criar";
  ui.fase = "login"; render();
}
let saiuEm = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { saiuEm = Date.now(); return; }
  if (ui.fase !== "pronto" || Date.now() - saiuEm < 30000) return;
  try { await carregar(); render(); } catch (e) { }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches && e.target.matches("#busca")) e.target.blur(); });
if ("serviceWorker" in navigator) {
  let recarregou = false; const tinhaControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (tinhaControle && !recarregou) { recarregou = true; location.reload(); } });
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => { }));
}
boot();
