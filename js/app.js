(() => {
  'use strict';
  
  const cfg = window.EVORA_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  
  const state = {
    sb: null, userId: null, profile: null, authMode: 'login', day: '', goalFilter: 'all',
    accounts: [], allAccounts: [], categories: [], txs: [],
    sgoals: [], sentries: [],
    eng: { debt: { items: [], pays: [] }, rec: { items: [], pays: [] }, ent: { items: [], pays: [] } },
    goals: [], steps: [], tasks: [], habits: [], logs: []
  };
  
  /* =====================================================================
     Icônes
     ===================================================================== */
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    wallet: '<path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="17" cy="13.5" r="1"/>',
    bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M17 5a3.5 3.5 0 010 7M22 20c0-3-2-4.7-5-5.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    bell: '<path d="M6 9a6 6 0 1112 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 20a2 2 0 004 0"/>'
  };
  const icon = (n, cls = '') => `<svg class="svg ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const LOGO = `<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="8" height="3" rx="1.5" fill="#fff"/><rect x="4" y="10.5" width="12" height="3" rx="1.5" fill="#fff"/><rect x="4" y="16" width="16" height="3" rx="1.5" fill="#fff"/></svg></span><span>EVORA</span>`;
  
  /* =====================================================================
     Utilitaires
     ===================================================================== */
  const pad = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const today = () => isoDate(new Date());
  const parseD = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const daysUntil = s => Math.round((parseD(s) - parseD(today())) / 86400000);
  const num = v => Number(v) || 0;
  const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0);
  const sumBy = (arr, f) => arr.reduce((s, x) => s + num(f(x)), 0);
  const currency = () => state.profile?.currency || 'XAF';
  const money = n => {
    const label = currency() === 'XAF' ? 'FCFA' : currency();
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num(n))} ${label}`.replace(/[\u202f\u00a0]/g, ' ');
  };
  const fmtDate = s => parseD(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtMonth = d => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const firstName = () => (state.profile?.display_name || '').trim().split(/\s+/)[0] || 'toi';
  const v = (f, n) => String(f.elements[n]?.value ?? '').trim();
  const ACC_TYPES = { mobile_money: 'Mobile Money', bank: 'Banque', cash: 'Espèces', other: 'Autre' };
  const CATS = { finance: 'Finances', etudes: 'Études', carriere: 'Carrière', projet: 'Projets', personnel: 'Personnel', autre: 'Autre' };
  const COLORS = ['#16A664', '#3B82F6', '#F0A39B', '#E0A21C', '#8B5CF6', '#14B8A6', '#94A3B8'];
  
  function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), isErr ? 6000 : 3200);
  }
  function friendlyError(e) {
    const m = String(e?.message || e || '');
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/already registered|already been registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail.';
    if (/Email not confirmed/i.test(m)) return 'Confirme ton e-mail via le lien reçu avant de te connecter.';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
    if (/Réservé|Impossible|Seul le Super Admin|introuvable/i.test(m)) return m;
    if (/does not exist|Could not find the table|schema cache/i.test(m)) return 'Ce module n’est pas encore prêt : exécute le fichier SQL 02 dans Supabase.';
    if (/violates foreign key/i.test(m)) return 'Impossible : cet élément est encore utilisé ailleurs.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Connexion impossible. Vérifie ton réseau et réessaie.';
    return 'Une erreur est survenue. Réessaie.';
  }
  function busy(form, on) { const b = form.querySelector('button[type=submit]'); if (b) b.disabled = on; }
  
  /* Petits composants HTML */
  const bar = (p, tone = '') => `<div class="bar ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><span style="width:${p}%"></span></div>`;
  const pill = (text, tone = '') => `<span class="pill ${tone}">${esc(text)}</span>`;
  const emptyBox = (msg, btn = '') => `<div class="empty"><span>${esc(msg)}</span>${btn}</div>`;
  const li = o => `<div class="li${o.cls ? ' ' + o.cls : ''}"><span class="lic ${o.tone || 'green'}">${icon(o.ic || 'wallet')}</span><div class="lmain"><b>${esc(o.title)}</b>${o.sub ? `<span class="lsub">${esc(o.sub)}</span>` : ''}</div><div class="lright"><b class="${o.rtone || ''}">${esc(o.right || '')}</b>${o.rsub ? `<span class="lsub">${esc(o.rsub)}</span>` : ''}</div>${o.del || ''}</div>`;
  const statCard = (ic, tone, label, valueHtml) => `<div class="card stat"><span class="ic ${tone}">${icon(ic)}</span><span class="label">${esc(label)}</span><span class="value">${valueHtml}</span></div>`;
  const dueText = d => { const n = daysUntil(d); return n < 0 ? `En retard de ${-n} j` : n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : fmtDate(d); };
  const dueBadge = d => {
    if (!d) return '';
    const n = daysUntil(d);
    if (n < 0) return pill(`En retard de ${-n} j`, 'off');
    if (n === 0) return pill('Aujourd’hui', 'warn');
    if (n <= 7) return pill(`Dans ${n} j`, 'warn');
    return pill(fmtDate(d), 'mute');
  };
  
  /* Graphiques SVG / CSS */
  function spark(values, id) {
    if (values.length < 2) return '';
    const w = 300, h = 70;
    const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
    const pts = values.map((val, i) => [i / (values.length - 1) * w, h - 6 - (val - min) / span * (h - 12)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5FE0A5" stop-opacity=".45"/><stop offset="1" stop-color="#5FE0A5" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="#5FE0A5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function donut(items, emptyMsg) {
    const list = items.filter(i => i.value > 0);
    const total = sumBy(list, i => i.value);
    if (!list.length) return emptyBox(emptyMsg);
    let acc = 0;
    const stops = list.map((it, i) => { const s = acc; acc += it.value / total * 100; return `${it.color || COLORS[i % COLORS.length]} ${s.toFixed(2)}% ${acc.toFixed(2)}%`; }).join(',');
    return `<div class="donutbox"><div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="Répartition"></div>
      <div class="dlegend">${list.map((it, i) => `<div><i style="background:${it.color || COLORS[i % COLORS.length]}"></i><span>${esc(it.name)}</span><span>${Math.round(it.value / total * 100)}%</span></div>`).join('')}</div></div>`;
  }
  function barsChart(months) {
    const max = Math.max(1, ...months.map(b => Math.max(b.income, b.expense)));
    return `<div class="bars" role="img" aria-label="Revenus et dépenses des 6 derniers mois">${months.map(b => `<div class="m"><div class="pair"><span class="bar i" style="height:${(b.income / max * 100).toFixed(1)}%"></span><span class="bar e" style="height:${(b.expense / max * 100).toFixed(1)}%"></span></div><span class="lab">${esc(b.label)}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>Revenus</span><span><i style="background:#F0A39B"></i>Dépenses</span></div>`;
  }
  function lineChart(labels, series) {
    const w = 320, h = 140, p = 10;
    const max = Math.max(1, ...series.flatMap(s => s.values));
    const x = i => p + i * (w - 2 * p) / Math.max(1, labels.length - 1);
    const y = val => h - p - (val / max) * (h - 2 * p);
    const grid = [0, .5, 1].map(t => `<line x1="${p}" x2="${w - p}" y1="${(h - p - t * (h - 2 * p)).toFixed(1)}" y2="${(h - p - t * (h - 2 * p)).toFixed(1)}" stroke="#E3EAE6" stroke-width="1"/>`).join('');
    const paths = series.map(s => {
      const d = s.values.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(' ');
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` + s.values.map((val, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(val).toFixed(1)}" r="3.2" fill="${s.color}"/>`).join('');
    }).join('');
    return `<svg class="line" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution sur 6 mois">${grid}${paths}</svg>
      <div class="xlabels">${labels.map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  }
  
  /* =====================================================================
     Types d'engagements : dettes, argent à recevoir, argent confié
     ===================================================================== */
  const KINDS = {
    debt: { table: 'debts', view: 'debt_summary', pays: 'debt_payments', fk: 'debt_id', tab: 'je-dois', tabLabel: 'Je dois', icon: 'card', tone: 'red',
      total: 'Reste à rembourser', paid: 'Déjà remboursé', rest: 'Reste à payer', payBtn: 'Rembourser', addBtn: 'Nouvelle dette',
      personLabel: 'À qui dois-je cet argent ?', dueLabel: 'Échéance (facultatif)', accLabel: 'Payé depuis le compte (facultatif)', payTitle: 'Enregistrer un remboursement', priority: true,
      emptyMsg: 'Aucune dette enregistrée. C’est le moment d’ajouter celles que tu dois pour ne rien oublier.' },
    rec: { table: 'receivables', view: 'receivable_summary', pays: 'receivable_payments', fk: 'receivable_id', tab: 'on-me-doit', tabLabel: 'On me doit', icon: 'down', tone: 'blue',
      total: 'Reste à recevoir', paid: 'Déjà reçu', rest: 'Reste à recevoir', payBtn: 'Encaisser', addBtn: 'Nouvelle créance',
      personLabel: 'Qui me doit cet argent ?', dueLabel: 'Date prévue (facultatif)', accLabel: 'Reçu sur le compte (facultatif)', payTitle: 'Enregistrer un encaissement',
      emptyMsg: 'Personne ne te doit d’argent pour le moment.' },
    ent: { table: 'entrusted', view: 'entrusted_summary', pays: 'entrusted_returns', fk: 'entrusted_id', tab: 'confie', tabLabel: 'Confié', icon: 'users', tone: 'amber',
      total: 'Argent confié', paid: 'Déjà récupéré', rest: 'Reste confié', payBtn: 'Récupérer', addBtn: 'Nouveau dépôt',
      personLabel: 'Qui garde ton argent ?', dueLabel: 'Retour prévu (facultatif)', accLabel: 'Récupéré sur le compte (facultatif)', payTitle: 'Enregistrer un retour d’argent',
      emptyMsg: 'Tu n’as confié d’argent à personne pour le moment.' }
  };
  
  /* =====================================================================
     Chargement des données (par groupes)
     ===================================================================== */
  async function q(p) { const { data, error } = await p; if (error) throw error; return data || []; }
  const sb = () => state.sb;
  
  async function loadEng(kind) {
    const c = KINDS[kind];
    const [items, pays] = await Promise.all([
      q(sb().from(c.view).select('*').order('due_date', { ascending: true, nullsFirst: false })),
      q(sb().from(c.pays).select('*').order('paid_on', { ascending: false }).limit(1000))
    ]);
    state.eng[kind] = { items, pays };
  }
  const LOADERS = {
    async accounts() {
      state.allAccounts = await q(sb().from('account_balances').select('*').order('name'));
      state.accounts = state.allAccounts.filter(a => !a.is_archived);
    },
    async tx() {
      const since = new Date(); since.setDate(1); since.setMonth(since.getMonth() - 5);
      state.txs = await q(sb().from('transactions').select('*').gte('occurred_on', isoDate(since))
        .order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(1500));
    },
    async savings() {
      const [g, e] = await Promise.all([
        q(sb().from('savings_goals').select('*').order('created_at')),
        q(sb().from('savings_entries').select('*').order('occurred_on', { ascending: false }).limit(2000))
      ]);
      state.sgoals = g; state.sentries = e;
    },
    debt: () => loadEng('debt'),
    rec: () => loadEng('rec'),
    ent: () => loadEng('ent'),
    async goals() {
      const [g, s] = await Promise.all([
        q(sb().from('goals').select('*').order('created_at', { ascending: false })),
        q(sb().from('goal_steps').select('*').order('position').order('created_at'))
      ]);
      state.goals = g; state.steps = s;
    },
    async tasks() { state.tasks = await q(sb().from('tasks').select('*').order('created_at', { ascending: false }).limit(1000)); },
    async habits() {
      const since = new Date(); since.setDate(since.getDate() - 120);
      const [h, l] = await Promise.all([
        q(sb().from('habits').select('*').eq('is_archived', false).order('created_at')),
        q(sb().from('habit_logs').select('*').gte('done_on', isoDate(since)))
      ]);
      state.habits = h; state.logs = l;
    }
  };
  const EXTRA_GROUPS = ['savings', 'debt', 'rec', 'ent', 'goals', 'tasks', 'habits'];
  
  async function loadAll() {
    try {
      const [p, cats] = await Promise.all([
        sb().from('profiles').select('*').eq('id', state.userId).single(),
        q(sb().from('categories').select('*').order('name'))
      ]);
      if (p.error) throw p.error;
      state.profile = p.data;
      state.categories = cats;
      await Promise.all([LOADERS.accounts(), LOADERS.tx()]);
    } catch (e) { toast(friendlyError(e), true); return false; }
    const res = await Promise.allSettled(EXTRA_GROUPS.map(g => LOADERS[g]()));
    if (res.some(r => r.status === 'rejected')) toast('Certains modules ne sont pas encore prêts : exécute le fichier SQL 02 dans Supabase.', true);
    return true;
  }
  async function reload(...groups) {
    const res = await Promise.allSettled(groups.map(g => LOADERS[g]()));
    const bad = res.find(r => r.status === 'rejected');
    if (bad) toast(friendlyError(bad.reason), true);
    route(true);
  }
  
  /* =====================================================================
     Démarrage & session
     ===================================================================== */
  function showFatal(msg) {
    const a = $('#auth');
    a.hidden = false; a.style.placeItems = 'center';
    a.innerHTML = `<div class="auth-card"><h3>Impossible de démarrer EVORA</h3><p class="sub">${esc(msg)}</p></div>`;
  }
  function init() {
    state.day = today();
    const ok = val => val && !String(val).startsWith('COLLE_ICI');
    if (!ok(cfg.SUPABASE_URL) || !ok(cfg.SUPABASE_ANON_KEY)) {
      return showFatal('Ouvre js/config.js et colle l’URL du projet et la clé anon Supabase (Project Settings > API).');
    }
    if (!window.supabase) return showFatal('La bibliothèque Supabase n’a pas pu se charger. Vérifie ta connexion internet, puis recharge la page.');
    try {
      state.sb = window.supabase.createClient(cfg.SUPABASE_URL.trim(), cfg.SUPABASE_ANON_KEY.trim());
    } catch (e) {
      return showFatal('L’URL ou la clé dans js/config.js est invalide. L’URL doit commencer par https:// et se terminer par .supabase.co.');
    }
    state.sb.auth.onAuthStateChange((event, session) => { setTimeout(() => handleSession(event, session), 0); });
    window.addEventListener('hashchange', () => route());
  }
  
  async function handleSession(event, session) {
    if (!session) {
      state.userId = null; state.profile = null;
      closeSheet(); closeModal();
      $('#app').hidden = true;
      renderAuth();
      return;
    }
    if (event === 'PASSWORD_RECOVERY') location.hash = '#/profil';
    if (session.user.id === state.userId) return;
    state.userId = session.user.id;
    const ok = await loadAll();
    if (!ok) return;
    if (state.profile?.status === 'suspended') {
      toast('Ce compte est suspendu. Contacte l’administrateur.', true);
      await state.sb.auth.signOut();
      return;
    }
    $('#auth').hidden = true;
    $('#app').hidden = false;
    buildChrome();
    route();
  }
  
  /* =====================================================================
     Authentification
     ===================================================================== */
  function renderAuth() {
    const a = $('#auth');
    a.hidden = false; a.style.placeItems = '';
    const signup = state.authMode === 'signup';
    const hero = signup
      ? { h: 'Ton avenir commence par une bonne gestion d’aujourd’hui.', p: 'Rejoins des personnes qui construisent une meilleure vie, étape par étape.' }
      : { h: 'Prends le contrôle de ta vie financière et de tes objectifs.', p: 'Une application pour gérer ton argent, organiser ton quotidien et atteindre tes ambitions.' };
    const feats = [['wallet', 'Suivi de tes finances'], ['target', 'Gestion de tes objectifs'], ['checkbox', 'Organisation et habitudes'], ['chart', 'Statistiques et progression']];
    const form = signup ? `
        <h3>Créer ton compte</h3><p class="sub">Remplis les informations ci-dessous pour commencer.</p>
        <form data-form="signup" novalidate>
          <div id="auth-msg"></div>
          <div class="field"><label for="f-name">Nom complet</label><input class="input" id="f-name" name="name" autocomplete="name" placeholder="Ex. Jean Dupont" required></div>
          <div class="field"><label for="f-email">E-mail</label><input class="input" id="f-email" name="email" type="email" autocomplete="email" placeholder="ex. jean@exemple.com" required></div>
          <div class="field"><label for="f-pass">Mot de passe</label><input class="input" id="f-pass" name="password" type="password" autocomplete="new-password" required><span class="hint">8 caractères minimum</span></div>
          <div class="field"><label for="f-pass2">Confirmer le mot de passe</label><input class="input" id="f-pass2" name="password2" type="password" autocomplete="new-password" required></div>
          <button class="btn block" type="submit">Créer mon compte</button>
        </form>
        <p class="alt">Déjà un compte ? <button class="linkbtn" data-action="auth-mode" data-mode="login">Se connecter</button></p>` : `
        <h3>Bienvenue sur EVORA</h3><p class="sub">Connecte-toi à ton espace personnel.</p>
        <form data-form="login" novalidate>
          <div id="auth-msg"></div>
          <div class="field"><label for="f-email">E-mail</label><input class="input" id="f-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="f-pass">Mot de passe</label><input class="input" id="f-pass" name="password" type="password" autocomplete="current-password" required></div>
          <div class="rowlink"><button class="linkbtn" type="button" data-action="forgot">Mot de passe oublié ?</button></div>
          <button class="btn block" type="submit">Se connecter</button>
        </form>
        <p class="alt">Pas encore de compte ? <button class="linkbtn" data-action="auth-mode" data-mode="signup">Créer un compte</button></p>`;
    a.innerHTML = `
      <section class="auth-hero">
        <div class="brand">${LOGO}</div>
        <h2>${esc(hero.h)}</h2>
        <p>${esc(hero.p)}</p>
        <ul>${feats.map(f => `<li><span class="ic">${icon(f[0])}</span>${esc(f[1])}</li>`).join('')}</ul>
      </section>
      <section class="auth-side"><div class="auth-card">${form}</div></section>`;
  }
  function authMsg(text, ok = false) {
    const el = $('#auth-msg');
    if (el) el.innerHTML = text ? `<div class="msg ${ok ? 'ok' : 'err'}">${esc(text)}</div>` : '';
  }
  
  /* =====================================================================
     Fenêtres (modale + feuille du bas)
     ===================================================================== */
  function openModal(html) { const d = $('#modal'); d.innerHTML = html; if (!d.open) d.showModal(); }
  function closeModal() { const d = $('#modal'); if (d && d.open) d.close(); }
  function modalMsg(t) { const el = $('#modal .modalmsg'); if (el) el.innerHTML = `<div class="msg err">${esc(t)}</div>`; }
  function openSheet(html) { const d = $('#sheet'); d.innerHTML = html; if (!d.open) d.showModal(); }
  function closeSheet() { const d = $('#sheet'); if (d && d.open) d.close(); }
  const sheetHtml = (title, body) => `<div class="sheet-body"><div class="sheet-head"><h3>${esc(title)}</h3><button class="iconbtn" data-action="close-sheet" aria-label="Fermer">${icon('close')}</button></div>${body}</div>`;
  
  /* Aides pour construire les formulaires */
  const fld = (label, id, control, hint = '') => `<div class="field"><label for="${id}">${label}</label>${control}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const inp = (id, name, attrs = '') => `<input class="input" id="${id}" name="${name}" ${attrs}>`;
  const sel = (id, name, options, value = '') => `<select class="input" id="${id}" name="${name}">${options.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const hid = (name, value) => `<input type="hidden" name="${name}" value="${esc(value)}">`;
  const formModal = (title, name, body, submit = 'Enregistrer') => openModal(`
    <h3>${esc(title)}</h3>
    <form data-form="${name}" novalidate>
      <div class="modalmsg"></div>${body}
      <div class="actions"><button type="button" class="btn ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">${esc(submit)}</button></div>
    </form>`);
  const accOptions = (first = 'Ne pas toucher à un compte') => [['', first], ...state.accounts.map(a => [a.account_id, a.name])];
  const unit = () => (currency() === 'XAF' ? 'FCFA' : currency());
  
  function txModal(kind, date) {
    if (!state.accounts.length) { toast('Ajoute d’abord un compte pour enregistrer une opération.', true); location.hash = '#/comptes'; return; }
    const cats = state.categories.filter(c => c.kind === kind).map(c => [c.id, c.name]);
    formModal(kind === 'income' ? 'Ajouter un revenu' : 'Ajouter une dépense', 'tx',
      hid('kind', kind) +
      `<div class="row2">${fld(`Montant (${unit()})`, 'm-amount', inp('m-amount', 'amount', 'type="number" inputmode="decimal" min="0" step="any" required'))}
        ${fld('Date', 'm-date', inp('m-date', 'occurred_on', `type="date" value="${esc(date || today())}" required`))}</div>
      <div class="row2">${fld('Compte', 'm-acc', sel('m-acc', 'account_id', state.accounts.map(a => [a.account_id, a.name])))}
        ${fld('Catégorie', 'm-cat', sel('m-cat', 'category_id', [['', 'Sans catégorie'], ...cats]))}</div>
      ${fld('Description (facultatif)', 'm-note', inp('m-note', 'note', 'maxlength="140"'))}`);
  }
  function accountModal() {
    formModal('Ajouter un compte', 'account',
      fld('Nom du compte', 'a-name', inp('a-name', 'name', 'maxlength="60" placeholder="Ex. MTN Mobile Money" required')) +
      `<div class="row2">${fld('Type', 'a-type', sel('a-type', 'type', Object.entries(ACC_TYPES)))}
        ${fld('Solde actuel', 'a-bal', inp('a-bal', 'initial_balance', 'type="number" inputmode="decimal" step="any" value="0"'))}</div>`, 'Ajouter');
  }
  function savGoalModal() {
    formModal('Nouvel objectif d’épargne', 'savgoal',
      fld('Nom de l’objectif', 's-name', inp('s-name', 'name', 'maxlength="80" placeholder="Ex. Ordinateur, voyage, formation" required')) +
      `<div class="row2">${fld(`Montant à atteindre (${unit()})`, 's-target', inp('s-target', 'target_amount', 'type="number" inputmode="decimal" min="0" step="any" required'))}
        ${fld('Date souhaitée (facultatif)', 's-dead', inp('s-dead', 'deadline', 'type="date"'))}</div>`, 'Créer');
  }
  function savMoveModal(kind, goalId) {
    const goals = state.sgoals.filter(g => !g.is_archived);
    if (!goals.length) { toast('Crée d’abord un objectif d’épargne.', true); location.hash = '#/epargne'; return; }
    const dep = kind !== 'withdrawal';
    formModal(dep ? 'Verser sur un objectif' : 'Retirer de l’épargne', 'savmove',
      hid('kind', dep ? 'deposit' : 'withdrawal') +
      fld('Objectif', 'v-goal', sel('v-goal', 'goal_id', goals.map(g => [g.id, g.name]), goalId || goals[0].id)) +
      `<div class="row2">${fld(`Montant (${unit()})`, 'v-amount', inp('v-amount', 'amount', 'type="number" inputmode="decimal" min="0" step="any" required'))}
        ${fld('Date', 'v-date', inp('v-date', 'occurred_on', `type="date" value="${today()}" required`))}</div>` +
      fld(dep ? 'Pris sur le compte (facultatif)' : 'Remis sur le compte (facultatif)', 'v-acc', sel('v-acc', 'account_id', accOptions()),
        'Si tu choisis un compte, son solde est mis à jour.'), dep ? 'Verser' : 'Retirer');
  }
  function engModal(kind) {
    const c = KINDS[kind];
    formModal(c.addBtn, 'eng',
      hid('kind', kind) +
      fld(c.personLabel, 'e-person', inp('e-person', 'person', 'maxlength="80" required')) +
      `<div class="row2">${fld(`Montant (${unit()})`, 'e-amount', inp('e-amount', 'initial_amount', 'type="number" inputmode="decimal" min="0" step="any" required'))}
        ${fld(c.dueLabel, 'e-due', inp('e-due', 'due_date', 'type="date"'))}</div>` +
      (c.priority ? fld('Priorité', 'e-prio', sel('e-prio', 'priority', [['1', 'Basse'], ['2', 'Normale'], ['3', 'Haute']], '2')) : '') +
      fld('Notes (facultatif)', 'e-notes', `<textarea class="input" id="e-notes" name="notes" maxlength="300"></textarea>`), 'Ajouter');
  }
  function engPayModal(kind, id) {
    const c = KINDS[kind], it = state.eng[kind].items.find(x => x.id === id);
    if (!it) return;
    formModal(c.payTitle, 'engpay',
      hid('kind', kind) + hid('parent_id', id) +
      `<p class="muted" style="margin-bottom:14px">${esc(it.person)} · ${esc(c.rest)} : <b>${esc(money(it.remaining))}</b></p>
      <div class="row2">${fld(`Montant (${unit()})`, 'p-amount', inp('p-amount', 'amount', `type="number" inputmode="decimal" min="0" step="any" value="${esc(num(it.remaining))}" required`))}
        ${fld('Date', 'p-date', inp('p-date', 'paid_on', `type="date" value="${today()}" required`))}</div>` +
      fld(c.accLabel, 'p-acc', sel('p-acc', 'account_id', accOptions()), 'Si tu choisis un compte, son solde est mis à jour.') +
      fld('Note (facultatif)', 'p-note', inp('p-note', 'note', 'maxlength="140"')), 'Enregistrer');
  }
  function engHistoryModal(kind, id) {
    const c = KINDS[kind], it = state.eng[kind].items.find(x => x.id === id);
    if (!it) return;
    const pays = state.eng[kind].pays.filter(p => p[c.fk] === id);
    openModal(`<h3>Historique · ${esc(it.person)}</h3>
      ${pays.length ? `<div class="list">${pays.map(p => li({ ic: c.icon, tone: c.tone, title: money(p.amount), sub: [fmtDate(p.paid_on), p.note].filter(Boolean).join(' · '), right: '',
        del: `<button class="iconbtn sm" data-action="eng-paydel" data-kind="${kind}" data-id="${esc(p.id)}" aria-label="Supprimer ce mouvement">${icon('trash')}</button>` })).join('')}</div>` : emptyBox('Aucun mouvement enregistré.')}
      <div class="actions"><button type="button" class="btn ghost" data-action="close-modal">Fermer</button></div>`);
  }
  function goalModal() {
    formModal('Nouvel objectif', 'goal',
      fld('Titre', 'g-title', inp('g-title', 'title', 'maxlength="100" placeholder="Ex. Apprendre JavaScript" required')) +
      fld('Description (facultatif)', 'g-desc', `<textarea class="input" id="g-desc" name="description" maxlength="400"></textarea>`) +
      `<div class="row2">${fld('Catégorie', 'g-cat', sel('g-cat', 'category', Object.entries(CATS), 'personnel'))}
        ${fld('Échéance (facultatif)', 'g-date', inp('g-date', 'target_date', 'type="date"'))}</div>`, 'Créer');
  }
  function stepModal(goalId) {
    formModal('Ajouter une étape', 'step', hid('goal_id', goalId) + fld('Étape', 'st-title', inp('st-title', 'title', 'maxlength="120" required')), 'Ajouter');
  }
  function taskModal() {
    const goals = state.goals.filter(g => g.status !== 'done').map(g => [g.id, g.title]);
    formModal('Nouvelle tâche', 'task',
      fld('Tâche', 't-title', inp('t-title', 'title', 'maxlength="140" placeholder="Ex. Étudier JavaScript, 1 heure" required')) +
      `<div class="row2">${fld('Pour le', 't-due', inp('t-due', 'due_on', `type="date" value="${today()}"`))}
        ${fld('Priorité', 't-prio', sel('t-prio', 'priority', [['1', 'Basse'], ['2', 'Normale'], ['3', 'Urgente']], '2'))}</div>` +
      (goals.length ? fld('Objectif lié (facultatif)', 't-goal', sel('t-goal', 'goal_id', [['', 'Aucun'], ...goals])) : ''), 'Ajouter');
  }
  function habitModal() {
    formModal('Nouvelle habitude', 'habit',
      fld('Habitude', 'h-name', inp('h-name', 'name', 'maxlength="80" placeholder="Ex. Lire 20 minutes" required')) +
      fld('Combien de fois par semaine ?', 'h-week', sel('h-week', 'per_week', [1, 2, 3, 4, 5, 6, 7].map(n => [String(n), n === 7 ? 'Tous les jours' : `${n} fois par semaine`]), '7')), 'Ajouter');
  }
  
  /* =====================================================================
     Coque de l'application & routage
     ===================================================================== */
  const NAV = [
    { id: 'accueil', label: 'Accueil', icon: 'home' },
    { id: 'finance', label: 'Finance', icon: 'chart' },
    { id: 'comptes', label: 'Comptes', icon: 'wallet' },
    { id: 'epargne', label: 'Épargne', icon: 'coins' },
    { id: 'dettes', label: 'Dettes & prêts', icon: 'card' },
    { id: 'objectifs', label: 'Objectifs', icon: 'target' },
    { id: 'taches', label: 'Tâches', icon: 'checkbox' },
    { id: 'habitudes', label: 'Habitudes', icon: 'flame' },
    { id: 'progression', label: 'Progression', icon: 'trend' },
    { id: 'admin', label: 'Administration', icon: 'shield', admin: true }
  ];
  const MOBILE_NAV = ['accueil', 'finance', 'epargne', 'taches'];
  const isAdmin = () => ['admin', 'super_admin'].includes(state.profile?.role);
  const navItems = () => NAV.filter(n => !n.admin || isAdmin());
  const currentPage = () => (location.hash.replace(/^#\/?/, '') || 'accueil').split('/')[0];
  
  function buildChrome() {
    $('.brand', $('.sidebar')).innerHTML = LOGO;
    const items = navItems();
    $('#nav').innerHTML = items.map(n => `<a href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${esc(n.label)}</span></a>`).join('');
    $('#bottomnav').innerHTML = MOBILE_NAV.map(id => {
      const n = items.find(x => x.id === id);
      return `<a href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${esc(n.label.split(' ')[0])}</span></a>`;
    }).join('') + `<button type="button" id="menubtn" data-action="open-menu" aria-haspopup="dialog">${icon('menu')}<span>Menu</span></button>`;
    const nm = state.profile?.display_name || '';
    $('#uname').textContent = nm;
    $('#avatar').textContent = (nm.trim()[0] || '?').toUpperCase();
    $('[data-action=logout]').innerHTML = icon('logout');
    $('#fab').innerHTML = icon('plus');
  }
  function menuHtml() {
    const cur = currentPage();
    const items = [...navItems(), { id: 'profil', label: 'Mon profil', icon: 'user' }];
    return sheetHtml('Menu', `<div class="tiles">${items.map(n => `<a class="tile" href="#/${n.id}" ${n.id === cur ? 'aria-current="page"' : ''}><span class="tic">${icon(n.icon)}</span><span>${esc(n.label)}</span></a>`).join('')}</div>
      <button class="btn ghost block" data-action="logout">${icon('logout')}Se déconnecter</button>`);
  }
  function quickHtml() {
    const t = [['tx-income', 'up', 'Revenu'], ['tx-expense', 'down', 'Dépense'], ['sav-deposit', 'coins', 'Épargne'], ['task-new', 'checkbox', 'Tâche']];
    return sheetHtml('Ajouter', `<div class="tiles">${t.map(([a, ic, l]) => `<button class="tile" data-action="${a}"><span class="tic">${icon(ic)}</span><span>${l}</span></button>`).join('')}</div>`);
  }
  
  const TITLES = { accueil: 'Accueil', finance: 'Finance', comptes: 'Comptes', epargne: 'Épargne', dettes: 'Dettes & prêts', objectifs: 'Objectifs', taches: 'Tâches', habitudes: 'Habitudes', progression: 'Progression', profil: 'Mon profil', admin: 'Administration' };
  
  function route(keepScroll) {
    if (!state.userId || $('#app').hidden) return;
    const parts = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/');
    const page = TITLES[parts[0]] ? parts[0] : 'accueil', sub = parts[1] || '';
    const pages = {
      accueil: pageDashboard, finance: () => pageFinance(sub), comptes: pageAccounts, epargne: pageSavings,
      dettes: () => pageEng(sub), objectifs: pageGoals, taches: pageTasks, habitudes: pageHabits,
      progression: pageProgress, profil: pageProfile,
      admin: () => (isAdmin() ? emptyBox('Chargement…') : emptyBox('Cet espace est réservé aux administrateurs.'))
    };
    let html;
    try { html = pages[page](); } catch (e) { console.error(e); html = emptyBox('Une erreur d’affichage est survenue. Recharge la page.'); }
    $('#page-title').textContent = TITLES[page];
    document.title = `${TITLES[page]} — EVORA`;
    $('#view').innerHTML = html;
    document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const mb = $('#menubtn'); if (mb) mb.classList.toggle('active', !MOBILE_NAV.includes(page));
    closeSheet();
    if (page === 'admin' && isAdmin()) loadAdmin();
    if (page === 'finance' && !['mois', 'revenus', 'depenses'].includes(sub)) loadDay();
    if (!keepScroll) window.scrollTo(0, 0);
  }
  
  /* =====================================================================
     Calculs partagés
     ===================================================================== */
  function monthStats(key = monthKey(new Date())) {
    let income = 0, expense = 0;
    for (const t of state.txs) if (t.occurred_on.startsWith(key)) { if (t.kind === 'income') income += num(t.amount); else expense += num(t.amount); }
    return { income, expense };
  }
  const totalBalance = () => sumBy(state.accounts, a => a.balance);
  const goalSaved = id => state.sentries.reduce((s, e) => (e.goal_id === id ? s + (e.kind === 'deposit' ? num(e.amount) : -num(e.amount)) : s), 0);
  const totalSavings = () => state.sentries.reduce((s, e) => s + (e.kind === 'deposit' ? num(e.amount) : -num(e.amount)), 0);
  const engRemaining = k => sumBy(state.eng[k].items, i => Math.max(0, num(i.remaining)));
  function lastMonths(n = 6) {
    const now = new Date(), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'short' }), income: 0, expense: 0, savings: 0, debtPaid: 0 });
    }
    const at = key => out.find(x => key.startsWith(x.key));
    for (const t of state.txs) { const m = at(t.occurred_on); if (m) m[t.kind] += num(t.amount); }
    for (const e of state.sentries) { const m = at(e.occurred_on); if (m) m.savings += e.kind === 'deposit' ? num(e.amount) : -num(e.amount); }
    for (const p of state.eng.debt.pays) { const m = at(p.paid_on); if (m) m.debtPaid += num(p.amount); }
    return out;
  }
  function flowSeries(days = 30) {
    const map = {};
    for (const t of state.txs) map[t.occurred_on] = (map[t.occurred_on] || 0) + (t.kind === 'income' ? num(t.amount) : -num(t.amount));
    const out = []; let cum = 0;
    for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); cum += map[isoDate(d)] || 0; out.push(cum); }
    return out;
  }
  function habitStreak(habitId) {
    const set = new Set(state.logs.filter(l => !habitId || l.habit_id === habitId).map(l => l.done_on));
    const d = new Date();
    if (!set.has(isoDate(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function goalProgress(g) {
    const st = state.steps.filter(s => s.goal_id === g.id);
    if (g.status === 'done') return 100;
    return st.length ? Math.round(st.filter(s => s.is_done).length / st.length * 100) : num(g.progress);
  }
  function goalStatus(g) {
    if (g.status === 'done') return { key: 'done', label: 'Atteint', tone: '' };
    const p = goalProgress(g);
    if (!g.target_date) return { key: 'good', label: 'En cours', tone: 'mute' };
    if (daysUntil(g.target_date) < 0) return { key: 'late', label: 'En retard', tone: 'off' };
    const start = new Date(g.created_at).getTime(), end = parseD(g.target_date).getTime();
    const elapsed = end > start ? Math.min(100, (Date.now() - start) / (end - start) * 100) : 100;
    return p >= elapsed - 10 ? { key: 'good', label: 'En bonne voie', tone: '' } : { key: 'watch', label: 'À surveiller', tone: 'warn' };
  }
  function savingsEstimate(g) {
    const rest = num(g.target_amount) - goalSaved(g.id);
    if (rest <= 0) return 'Objectif atteint';
    const es = state.sentries.filter(e => e.goal_id === g.id);
    if (!es.length) return '';
    const first = es.reduce((m, e) => (e.occurred_on < m ? e.occurred_on : m), es[0].occurred_on);
    const span = Math.max(14, -daysUntil(first));
    const perDay = goalSaved(g.id) / span;
    if (perDay <= 0) return '';
    const d = new Date(); d.setDate(d.getDate() + Math.ceil(rest / perDay));
    return `À ce rythme : ${fmtMonth(d)}`;
  }
  
  /* =====================================================================
     Tableau de bord
     ===================================================================== */
  function attention() {
    const out = [];
    const label = { debt: (i, r, w) => `Remboursement de ${money(r)} à ${i.person} ${w}`, rec: (i, r, w) => `${i.person} te doit ${money(r)} ${w}`, ent: (i, r, w) => `${i.person} garde ${money(r)} pour toi ${w}` };
    for (const k of ['debt', 'rec', 'ent']) for (const i of state.eng[k].items) {
      const rem = num(i.remaining);
      if (rem <= 0 || !i.due_date) continue;
      const n = daysUntil(i.due_date);
      if (n > 7) continue;
      const when = n < 0 ? `(en retard de ${-n} j)` : n === 0 ? '(aujourd’hui)' : `(dans ${n} j)`;
      out.push({ rank: n, tone: n < 0 ? (k === 'debt' ? 'bad' : 'warn') : 'info', ic: 'bell', text: label[k](i, rem, when), href: `#/dettes/${KINDS[k].tab}` });
    }
    const open = state.tasks.filter(t => !t.is_done);
    const late = open.filter(t => t.due_on && daysUntil(t.due_on) < 0).length;
    const now = open.filter(t => t.due_on && daysUntil(t.due_on) === 0).length;
    if (late) out.push({ rank: -50, tone: 'warn', ic: 'checkbox', text: `${late} tâche${late > 1 ? 's' : ''} en retard`, href: '#/taches' });
    if (now) out.push({ rank: 0, tone: 'info', ic: 'checkbox', text: `${now} tâche${now > 1 ? 's' : ''} pour aujourd’hui`, href: '#/taches' });
    for (const g of state.goals) {
      if (g.status === 'done' || !g.target_date) continue;
      const n = daysUntil(g.target_date);
      if (n >= 0 && n <= 14 && goalProgress(g) < 100) out.push({ rank: n, tone: 'warn', ic: 'target', text: `Objectif « ${g.title} » : échéance dans ${n} j (${goalProgress(g)} %)`, href: '#/objectifs' });
    }
    for (const g of state.sgoals) {
      if (g.is_archived || !g.deadline) continue;
      const n = daysUntil(g.deadline), p = pct(goalSaved(g.id), num(g.target_amount));
      if (n >= 0 && n <= 30 && p < 100) out.push({ rank: n, tone: 'warn', ic: 'coins', text: `Épargne « ${g.name} » : ${p} % à ${n} j de la date souhaitée`, href: '#/epargne' });
    }
    if (!out.length) return [{ tone: 'ok', ic: 'check', text: 'Rien d’urgent pour le moment. Tu peux avancer sur tes objectifs.', href: '#/objectifs' }];
    return out.sort((a, b) => a.rank - b.rank).slice(0, 5);
  }
  function nextMove() {
    const { income, expense } = monthStats();
    if (!state.accounts.length) return { tone: '', title: 'Ajoute ton premier compte', text: 'Mobile Money, banque ou espèces : EVORA calcule ton solde à partir de tes comptes.', btn: `<a class="btn sm" href="#/comptes">Ajouter un compte</a>` };
    const due = ['debt'].flatMap(k => state.eng[k].items.filter(i => num(i.remaining) > 0 && i.due_date && daysUntil(i.due_date) <= 7).map(i => ({ k, i })))
      .sort((a, b) => daysUntil(a.i.due_date) - daysUntil(b.i.due_date))[0];
    if (due) return { tone: 'warn', title: `Prépare le remboursement de ${money(due.i.remaining)} à ${due.i.person}`, text: `Échéance : ${dueText(due.i.due_date).toLowerCase()}.`, btn: `<button class="btn sm" data-action="eng-pay" data-kind="debt" data-id="${esc(due.i.id)}">Rembourser</button>` };
    const task = state.tasks.filter(t => !t.is_done && t.due_on && daysUntil(t.due_on) <= 0).sort((a, b) => b.priority - a.priority)[0];
    if (task) return { tone: 'info', title: `À faire aujourd’hui : ${task.title}`, text: 'Termine-la pour libérer ton esprit.', btn: `<a class="btn sm" href="#/taches">Voir mes tâches</a>` };
    const sg = state.sgoals.filter(g => !g.is_archived && g.deadline && num(g.target_amount) - goalSaved(g.id) > 0 && daysUntil(g.deadline) >= 0)
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))[0];
    if (sg) {
      const rest = num(sg.target_amount) - goalSaved(sg.id), weeks = Math.max(1, Math.ceil(daysUntil(sg.deadline) / 7));
      return { tone: '', title: `Pense à mettre ${money(Math.ceil(rest / weeks / 100) * 100)} de côté cette semaine`, text: `Pour atteindre « ${sg.name} » à temps (il reste ${money(rest)}).`, btn: `<button class="btn sm" data-action="sav-deposit" data-goal="${esc(sg.id)}">Verser</button>` };
    }
    if (!income && !expense) return { tone: 'info', title: 'Enregistre ta première opération', text: 'Un revenu ou une dépense suffit pour démarrer le suivi du mois.', btn: `<button class="btn sm" data-action="tx-expense">Ajouter une dépense</button>` };
    if (expense > income) return { tone: 'warn', title: 'Tes dépenses dépassent tes revenus ce mois-ci', text: `Écart de ${money(expense - income)}. Regarde la répartition pour repérer ce qui pèse le plus.`, btn: `<a class="btn sm" href="#/finance/mois">Voir la répartition</a>` };
    return { tone: '', title: 'Ton mois est équilibré', text: `Il te reste ${money(income - expense)} de marge ce mois-ci.`, btn: `<a class="btn sm" href="#/finance/mois">Voir les détails</a>` };
  }
  
  function taskRow(t) {
    const goal = t.goal_id ? state.goals.find(g => g.id === t.goal_id) : null;
    const meta = [t.due_on ? dueText(t.due_on) : 'Sans date', goal ? goal.title : ''].filter(Boolean).join(' · ');
    return `<div class="li task ${t.is_done ? 'done' : ''}"><button class="chk ${t.is_done ? 'on' : ''}" data-action="task-toggle" data-id="${esc(t.id)}" aria-pressed="${t.is_done}" aria-label="Marquer comme terminée">${icon('check')}</button>
      <div class="lmain"><b>${esc(t.title)}</b><span class="lsub">${esc(meta)}</span></div>${t.priority === 3 && !t.is_done ? pill('Urgent', 'off') : ''}
      <button class="iconbtn sm" data-action="task-del" data-id="${esc(t.id)}" aria-label="Supprimer la tâche">${icon('trash')}</button></div>`;
  }
  function txList(list, withDelete = true) {
    const cat = id => state.categories.find(c => c.id === id)?.name || 'Sans catégorie';
    const acc = id => state.allAccounts.find(a => a.account_id === id)?.name || '';
    return `<div class="list">${list.map(t => li({
      ic: t.kind === 'income' ? 'up' : 'down', tone: t.kind === 'income' ? 'green' : 'red',
      title: t.note || cat(t.category_id), sub: [cat(t.category_id), acc(t.account_id)].filter(Boolean).join(' · '),
      right: `${t.kind === 'income' ? '+' : '−'}${money(t.amount)}`, rtone: t.kind === 'income' ? 'pos' : 'neg', rsub: fmtDate(t.occurred_on),
      del: withDelete ? `<button class="iconbtn sm" data-action="del-tx" data-id="${esc(t.id)}" aria-label="Supprimer l’opération">${icon('trash')}</button>` : ''
    })).join('')}</div>`;
  }
  
  function pageDashboard() {
    const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const { income, expense } = monthStats();
    const bal = totalBalance(), sav = totalSavings(), debt = engRemaining('debt'), rec = engRemaining('rec'), ent = engRemaining('ent');
    const net = bal + sav + rec + ent - debt;
    const flow = flowSeries(30);
    const diff = income - expense;
    const m = nextMove();
    const al = attention();
    const todayTasks = state.tasks.filter(t => !t.is_done && t.due_on && daysUntil(t.due_on) <= 0).sort((a, b) => b.priority - a.priority).slice(0, 4);
    const streak = habitStreak(null);
    const activeGoals = state.goals.filter(g => g.status !== 'done');
    const gs = { good: 0, watch: 0, late: 0 };
    for (const g of activeGoals) { const s = goalStatus(g).key; if (gs[s] !== undefined) gs[s]++; }
    const savTarget = sumBy(state.sgoals.filter(g => !g.is_archived), g => g.target_amount);
    const tile = (href, ic, tone, label, value, sub = '') => `<a class="card stile" href="${href}"><span class="ic ${tone}">${icon(ic)}</span><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</a>`;
  
    return `
    <div class="greet"><h2>Bonjour ${esc(firstName())} 👋</h2><p>${esc(dateLabel)}</p></div>
  
    <section class="hero" aria-label="Solde disponible">
      <span class="label">Solde disponible</span>
      <div class="big">${esc(money(bal))}</div>
      ${pill(`Ce mois : ${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}`, 'dark')}
      ${spark(flow, 'sg-hero')}
      <div class="hero-actions"><button class="btn light sm" data-action="tx-income">${icon('up', 'sm')}Revenu</button><button class="btn light sm" data-action="tx-expense">${icon('down', 'sm')}Dépense</button></div>
    </section>
  
    <div class="tiles4">
      ${tile('#/epargne', 'coins', 'green', 'Épargne', money(sav), savTarget ? `${pct(sav, savTarget)} % de tes objectifs` : 'Aucun objectif')}
      ${tile('#/dettes/je-dois', 'card', 'red', 'Dettes', money(debt), debt ? 'à rembourser' : 'Aucune dette')}
      ${tile('#/dettes/on-me-doit', 'down', 'blue', 'À recevoir', money(rec))}
      ${tile('#/dettes/confie', 'users', 'amber', 'Confié', money(ent), 'gardé par d’autres')}
    </div>
  
    <div class="two">
      <div class="card callout"><h3>Mon prochain mouvement</h3>
        <div class="box ${m.tone}"><b>${esc(m.title)}</b><span class="muted">${esc(m.text)}</span></div>
        <div>${m.btn}</div>
      </div>
      <div class="card"><h3>Mon attention</h3>
        <div class="alerts">${al.map(a => `<a class="alert ${a.tone}" href="${a.href}">${icon(a.ic)}<span>${esc(a.text)}</span></a>`).join('')}</div>
      </div>
    </div>
  
    <div class="two">
      <div class="card"><div class="card-head"><h3>Priorités du jour</h3><a class="linkbtn" href="#/taches">Tout voir</a></div>
        ${todayTasks.length ? `<div class="list">${todayTasks.map(taskRow).join('')}</div>` : emptyBox('Aucune tâche pour aujourd’hui.', `<button class="btn sm" data-action="task-new">Ajouter une tâche</button>`)}
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Ma régularité</h3><a class="linkbtn" href="#/habitudes">Habitudes</a></div>
          ${state.habits.length ? `<div class="item-nums" style="grid-template-columns:auto 1fr;align-items:center;gap:14px"><span style="font-size:34px">🔥</span><div><b style="font-size:22px">${streak} jour${streak > 1 ? 's' : ''}</b><div class="lsub">de suite avec au moins une habitude</div></div></div>` : emptyBox('Crée une habitude pour suivre ta régularité.', `<button class="btn sm" data-action="habit-new">Nouvelle habitude</button>`)}
        </div>
        <div class="card"><div class="card-head"><h3>Mes objectifs</h3><a class="linkbtn" href="#/objectifs">Voir</a></div>
          ${activeGoals.length ? `<div class="lsub" style="margin-bottom:10px">${activeGoals.length} objectif${activeGoals.length > 1 ? 's' : ''} actif${activeGoals.length > 1 ? 's' : ''}</div>
            <div class="legend" style="margin-top:0"><span>${pill(`${gs.good} en bonne voie`)}</span><span>${pill(`${gs.watch} à surveiller`, 'warn')}</span><span>${pill(`${gs.late} en retard`, 'off')}</span></div>` : emptyBox('Aucun objectif actif.', `<button class="btn sm" data-action="goal-new">Créer un objectif</button>`)}
        </div>
      </div>
    </div>
  
    <div class="two">
      <div class="card"><h3>Où est mon argent ?</h3>
        ${donut([{ name: 'Disponible', value: Math.max(0, bal), color: '#16A664' }, { name: 'Épargne', value: Math.max(0, sav), color: '#3B82F6' }, { name: 'À recevoir', value: rec, color: '#8B5CF6' }, { name: 'Confié', value: ent, color: '#E0A21C' }], 'Ajoute un compte et tes premiers montants pour voir la répartition.')}
        <div class="list" style="margin-top:10px">
          ${debt ? li({ ic: 'card', tone: 'red', title: 'Dettes à rembourser', right: money(debt), rtone: 'neg' }) : ''}
          ${li({ ic: 'trend', tone: 'green', title: 'Situation nette', sub: 'Tout ce que tu as, moins tes dettes', right: money(net), rtone: net >= 0 ? 'pos' : 'neg' })}
        </div>
      </div>
      <div class="card"><h3>Revenus et dépenses</h3>${barsChart(lastMonths(6))}</div>
    </div>
  
    <div class="card"><div class="card-head"><h3>Dernières opérations</h3><a class="linkbtn" href="#/finance">Tout voir</a></div>
      ${state.txs.length ? txList(state.txs.slice(0, 5), false) : emptyBox('Aucune opération pour le moment.', `<button class="btn sm" data-action="tx-expense">Ajouter une dépense</button>`)}
    </div>`;
  }
  
  /* =====================================================================
     Finance : Jour | Mois | Revenus | Dépenses
     ===================================================================== */
  function financeTabs(sub) {
    const t = [['', 'Jour'], ['mois', 'Mois'], ['revenus', 'Revenus'], ['depenses', 'Dépenses']];
    return `<div class="tabs" role="tablist">${t.map(([k, l]) => `<a href="#/finance${k ? '/' + k : ''}" ${sub === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</div>`;
  }
  function pageFinance(sub) {
    if (sub !== 'mois' && sub !== 'revenus' && sub !== 'depenses') return `${financeTabs('')}<div id="dayview">${emptyBox('Chargement…')}</div>`;
    if (sub === 'revenus' || sub === 'depenses') {
      const kind = sub === 'revenus' ? 'income' : 'expense';
      const list = state.txs.filter(t => t.kind === kind);
      return `${financeTabs(sub)}
      <div class="pagehead"><h2>${kind === 'income' ? 'Revenus' : 'Dépenses'}</h2><button class="btn sm" data-action="tx-${kind}">${icon('plus', 'sm')}Ajouter</button></div>
      <div class="card">${list.length ? txList(list) : emptyBox(kind === 'income' ? 'Aucun revenu sur les 6 derniers mois.' : 'Aucune dépense sur les 6 derniers mois.')}</div>`;
    }
    const { income, expense } = monthStats();
    const key = monthKey(new Date()), byCat = {};
    for (const t of state.txs) if (t.kind === 'expense' && t.occurred_on.startsWith(key)) {
      const n = state.categories.find(c => c.id === t.category_id)?.name || 'Sans catégorie';
      byCat[n] = (byCat[n] || 0) + num(t.amount);
    }
    const items = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return `${financeTabs('mois')}
    <div class="pagehead"><h2>Ce mois-ci</h2><div style="display:flex;gap:8px"><button class="btn ghost sm" data-action="tx-expense">${icon('plus', 'sm')}Dépense</button><button class="btn sm" data-action="tx-income">${icon('plus', 'sm')}Revenu</button></div></div>
    <div class="g3">
      ${statCard('up', 'green', 'Total des entrées', `<span class="pos">${esc(money(income))}</span>`)}
      ${statCard('down', 'red', 'Total des sorties', `<span class="neg">${esc(money(expense))}</span>`)}
      ${statCard('wallet', 'blue', 'Solde du mois', `<span class="${income - expense >= 0 ? 'pos' : 'neg'}">${esc(money(income - expense))}</span>`)}
    </div>
    <div class="two">
      <div class="card"><h3>Évolution sur 6 mois</h3>${barsChart(lastMonths(6))}</div>
      <div class="card"><h3>Répartition des dépenses</h3>${donut(items, 'Aucune dépense ce mois-ci. Ajoute-en une pour voir la répartition.')}</div>
    </div>`;
  }
  
  /* Vue "Jour" */
  function shiftDay(n) {
    const [y, m, d] = state.day.split('-').map(Number);
    state.day = isoDate(new Date(y, m - 1, d + n));
    loadDay();
  }
  async function loadDay() {
    const day = state.day;
    const [y, m] = day.split('-').map(Number);
    const start = `${y}-${pad(m)}-01`, end = isoDate(new Date(y, m, 0));
    const { data, error } = await state.sb.from('transactions').select('*').gte('occurred_on', start).lte('occurred_on', end).order('created_at', { ascending: false });
    const box = $('#dayview');
    if (!box || day !== state.day) return;
    if (error) { box.innerHTML = `<div class="card"><div class="msg err">${esc(friendlyError(error))}</div></div>`; return; }
    box.innerHTML = dayView(data || []);
  }
  function dayView(monthTxs) {
    const day = state.day, td = today();
    const [y, m, d] = day.split('-').map(Number);
    const longDate = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const monthLabel = fmtMonth(new Date(y, m - 1, 1));
    const list = monthTxs.filter(t => t.occurred_on === day);
    const sum = (arr, k) => arr.filter(t => t.kind === k).reduce((s, t) => s + num(t.amount), 0);
    const inc = sum(list, 'income'), exp = sum(list, 'expense');
    const byDay = {};
    for (const t of monthTxs) { if (!byDay[t.occurred_on]) byDay[t.occurred_on] = { income: 0, expense: 0 }; byDay[t.occurred_on][t.kind] += num(t.amount); }
    const days = Object.keys(byDay).sort().reverse();
    const mIn = days.reduce((s, k) => s + byDay[k].income, 0), mOut = days.reduce((s, k) => s + byDay[k].expense, 0);
    const rows = days.map(k => `<div class="li sel-row ${k === day ? 'sel' : ''}"><span class="lic ${byDay[k].income >= byDay[k].expense ? 'green' : 'red'}">${icon('calendar')}</span>
      <button class="lmain clickable" data-action="pick-day" data-day="${esc(k)}"><b>${esc(fmtDate(k))}</b><span class="lsub">+${esc(money(byDay[k].income))} · −${esc(money(byDay[k].expense))}</span></button>
      <div class="lright"><b class="${byDay[k].income - byDay[k].expense >= 0 ? 'pos' : 'neg'}">${esc(money(byDay[k].income - byDay[k].expense))}</b></div></div>`).join('');
    return `<div class="stack" style="gap:18px">
    <div class="daynav">
      <button class="btn ghost sm" data-action="day-prev" aria-label="Jour précédent">‹</button>
      <input class="input" type="date" id="day-input" value="${esc(day)}" aria-label="Choisir un jour">
      <button class="btn ghost sm" data-action="day-next" aria-label="Jour suivant">›</button>
      ${day !== td ? '<button class="btn ghost sm" data-action="day-today">Aujourd’hui</button>' : ''}
    </div>
    <div class="pagehead"><h2 style="text-transform:capitalize">${esc(longDate)} ${day === td ? '<span class="soon">Aujourd’hui</span>' : ''}</h2>
      <div style="display:flex;gap:8px"><button class="btn ghost sm" data-action="tx-expense" data-date="${esc(day)}">${icon('plus', 'sm')}Dépense</button><button class="btn sm" data-action="tx-income" data-date="${esc(day)}">${icon('plus', 'sm')}Revenu</button></div></div>
    <div class="g3">
      ${statCard('up', 'green', 'Entrées du jour', `<span class="pos">${esc(money(inc))}</span>`)}
      ${statCard('down', 'red', 'Sorties du jour', `<span class="neg">${esc(money(exp))}</span>`)}
      ${statCard('wallet', 'blue', 'Bilan du jour', `<span class="${inc - exp >= 0 ? 'pos' : 'neg'}">${esc(money(inc - exp))}</span>`)}
    </div>
    <div class="card"><h3>Opérations de ce jour</h3>${list.length ? txList(list) : emptyBox('Aucune opération ce jour-là. Utilise les boutons ci-dessus pour en ajouter.')}</div>
    <div class="card"><div class="card-head"><h3>Jour par jour, ${esc(monthLabel)}</h3><a class="linkbtn" href="#/finance/mois">Vue du mois</a></div>
      ${days.length ? `<div class="list">${rows}</div>
        <div class="li" style="border-top:2px solid var(--line);border-bottom:0;margin-top:4px;grid-template-columns:1fr auto"><b>Total du mois</b><div class="lright"><b class="${mIn - mOut >= 0 ? 'pos' : 'neg'}">${esc(money(mIn - mOut))}</b><span class="lsub">+${esc(money(mIn))} · −${esc(money(mOut))}</span></div></div>` : emptyBox('Aucune opération ce mois-ci.')}
    </div></div>`;
  }
  
  /* =====================================================================
     Comptes
     ===================================================================== */
  function pageAccounts() {
    const total = totalBalance();
    return `<div class="pagehead"><h2>Mes comptes</h2><button class="btn sm" data-action="add-account">${icon('plus', 'sm')}Ajouter</button></div>
    ${state.accounts.length ? `
      <div class="card total-card" style="background:var(--mint)"><span class="label muted">Total disponible</span><div class="value pos" style="font-size:28px;font-weight:800">${esc(money(total))}</div></div>
      <div class="card"><div class="list">${state.accounts.map(a => li({
        ic: a.type === 'bank' ? 'bank' : 'wallet', title: a.name, sub: ACC_TYPES[a.type] || 'Autre', right: money(a.balance), rtone: num(a.balance) < 0 ? 'neg' : '',
        del: `<button class="iconbtn sm" data-action="archive-account" data-id="${esc(a.account_id)}" aria-label="Archiver ce compte" title="Archiver">${icon('trash')}</button>`
      })).join('')}</div></div>`
      : `<div class="card">${emptyBox('Tu n’as pas encore de compte. Ajoute MTN Mobile Money, Orange Money, ta banque ou tes espèces.', `<button class="btn" data-action="add-account">Ajouter un compte</button>`)}</div>`}`;
  }
  
  /* =====================================================================
     Épargne
     ===================================================================== */
  function pageSavings() {
    const goals = state.sgoals.filter(g => !g.is_archived);
    const total = totalSavings(), target = sumBy(goals, g => g.target_amount);
    const cards = goals.map(g => {
      const saved = goalSaved(g.id), p = pct(saved, num(g.target_amount)), est = savingsEstimate(g);
      return `<article class="card item">
        <div class="item-head"><div><b class="item-title">${esc(g.name)}</b><span class="lsub">${g.deadline ? `Pour le ${esc(fmtDate(g.deadline))}` : 'Sans date limite'}</span></div>${p >= 100 ? pill('Atteint') : dueBadge(g.deadline)}</div>
        <div class="item-nums"><div><span class="label">Épargné</span><b>${esc(money(saved))}</b></div><div><span class="label">Objectif</span><b>${esc(money(g.target_amount))}</b></div><div><span class="label">Progression</span><b>${p} %</b></div></div>
        ${bar(p)}${est ? `<span class="lsub">${esc(est)}</span>` : ''}
        <div class="item-actions"><button class="btn sm" data-action="sav-deposit" data-goal="${esc(g.id)}">Verser</button><button class="btn ghost sm" data-action="sav-withdraw" data-goal="${esc(g.id)}">Retirer</button><button class="linkbtn danger" data-action="sav-archive" data-id="${esc(g.id)}">Archiver</button></div>
      </article>`;
    }).join('');
    const nameOf = id => state.sgoals.find(g => g.id === id)?.name || '';
    const recent = state.sentries.slice(0, 8);
    return `<div class="pagehead"><h2>Mon épargne</h2><button class="btn sm" data-action="sav-new">${icon('plus', 'sm')}Objectif</button></div>
    ${goals.length ? `
      <div class="hero"><span class="label">Total épargné</span><div class="big">${esc(money(total))}</div>
        ${target ? `${bar(pct(total, target))}<span class="lsub" style="color:#A9D4C0;display:block;margin-top:8px">${pct(total, target)} % de ${esc(money(target))}</span>` : ''}</div>
      ${cards}
      ${recent.length ? `<div class="card"><h3>Derniers mouvements</h3><div class="list">${recent.map(e => li({ ic: e.kind === 'deposit' ? 'up' : 'down', tone: e.kind === 'deposit' ? 'green' : 'amber', title: nameOf(e.goal_id), sub: [fmtDate(e.occurred_on), e.note].filter(Boolean).join(' · '), right: `${e.kind === 'deposit' ? '+' : '−'}${money(e.amount)}`, rtone: e.kind === 'deposit' ? 'pos' : '' })).join('')}</div></div>` : ''}`
      : `<div class="card">${emptyBox('Crée ton premier objectif d’épargne : un ordinateur, un voyage, une formation…', `<button class="btn" data-action="sav-new">Créer un objectif</button>`)}</div>`}`;
  }
  
  /* =====================================================================
     Dettes & prêts : Je dois | On me doit | Confié
     ===================================================================== */
  function pageEng(sub) {
    const k = Object.keys(KINDS).find(x => KINDS[x].tab === sub) || 'debt';
    const c = KINDS[k], items = state.eng[k].items;
    const rest = sumBy(items, i => Math.max(0, i.remaining)), total = sumBy(items, i => i.initial_amount), paid = sumBy(items, i => i.paid);
    const open = items.filter(i => num(i.remaining) > 0).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    const done = items.filter(i => num(i.remaining) <= 0);
    const card = i => {
      const rem = Math.max(0, num(i.remaining)), p = pct(num(i.paid), num(i.initial_amount));
      return `<article class="card item">
        <div class="item-head"><div><b class="item-title">${esc(i.person)}</b>${i.notes ? `<span class="lsub">${esc(i.notes)}</span>` : ''}</div>
          <div style="display:grid;gap:6px;justify-items:end">${rem <= 0 ? pill('Soldé') : dueBadge(i.due_date)}${c.priority && rem > 0 && num(i.priority) === 3 ? pill('Priorité haute', 'off') : ''}</div></div>
        <div class="item-nums"><div><span class="label">Montant</span><b>${esc(money(i.initial_amount))}</b></div><div><span class="label">${esc(c.paid)}</span><b>${esc(money(i.paid))}</b></div><div><span class="label">${esc(c.rest)}</span><b class="${k === 'debt' && rem > 0 ? 'neg' : ''}">${esc(money(rem))}</b></div></div>
        ${bar(p, k === 'debt' ? 'red' : k === 'rec' ? 'blue' : 'amber')}
        <div class="item-actions">${rem > 0 ? `<button class="btn sm" data-action="eng-pay" data-kind="${k}" data-id="${esc(i.id)}">${esc(c.payBtn)}</button>` : ''}<button class="btn ghost sm" data-action="eng-history" data-kind="${k}" data-id="${esc(i.id)}">Historique</button><button class="linkbtn danger" data-action="eng-del" data-kind="${k}" data-id="${esc(i.id)}">Supprimer</button></div>
      </article>`;
    };
    const tabs = `<div class="tabs" role="tablist">${Object.keys(KINDS).map(x => `<a href="#/dettes/${KINDS[x].tab}" ${x === k ? 'aria-current="page"' : ''}>${esc(KINDS[x].tabLabel)}</a>`).join('')}</div>`;
    return `${tabs}
    <div class="pagehead"><h2>${esc(c.total)}</h2><button class="btn sm" data-action="eng-new" data-kind="${k}">${icon('plus', 'sm')}Ajouter</button></div>
    <div class="card"><span class="label muted">${esc(c.total)}</span><div class="value ${k === 'debt' && rest ? 'neg' : ''}" style="font-size:28px;font-weight:800">${esc(money(rest))}</div>
      ${total ? `<div style="margin:12px 0 6px">${bar(pct(paid, total), k === 'debt' ? 'red' : k === 'rec' ? 'blue' : 'amber')}</div><span class="lsub">${esc(money(paid))} ${esc(c.paid.toLowerCase())} sur ${esc(money(total))}</span>` : ''}</div>
    ${open.length ? open.map(card).join('') : items.length ? '' : `<div class="card">${emptyBox(c.emptyMsg, `<button class="btn" data-action="eng-new" data-kind="${k}">${esc(c.addBtn)}</button>`)}</div>`}
    ${done.length ? `<h3 class="muted" style="font-size:14px">Soldés</h3>${done.map(card).join('')}` : ''}`;
  }
  
  /* =====================================================================
     Objectifs de vie
     ===================================================================== */
  function pageGoals() {
    const f = state.goalFilter;
    const filters = [['all', 'Tous'], ...Object.entries(CATS)];
    const list = state.goals.filter(g => f === 'all' || g.category === f);
    const active = state.goals.filter(g => g.status !== 'done');
    const cnt = { good: 0, watch: 0, late: 0 };
    for (const g of active) { const s = goalStatus(g).key; if (cnt[s] !== undefined) cnt[s]++; }
    const card = g => {
      const st = state.steps.filter(s => s.goal_id === g.id), p = goalProgress(g), s = goalStatus(g);
      return `<article class="card item">
        <div class="item-head"><div><b class="item-title">${esc(g.title)}</b><span class="lsub">${esc(CATS[g.category] || 'Autre')}${g.target_date ? ' · ' + esc(dueText(g.target_date)) : ''}</span></div>${pill(s.label, s.tone)}</div>
        ${g.description ? `<p class="muted">${esc(g.description)}</p>` : ''}
        <div>${bar(p)}<span class="lsub" style="display:block;margin-top:6px">${p} %</span></div>
        ${st.length ? `<div class="steps">${st.map(x => `<div class="li task ${x.is_done ? 'done' : ''}"><button class="chk ${x.is_done ? 'on' : ''}" data-action="step-toggle" data-id="${esc(x.id)}" aria-pressed="${x.is_done}" aria-label="Terminer l’étape">${icon('check')}</button><div class="lmain"><b>${esc(x.title)}</b></div><button class="iconbtn sm" data-action="step-del" data-id="${esc(x.id)}" aria-label="Supprimer l’étape">${icon('trash')}</button></div>`).join('')}</div>`
          : (g.status !== 'done' ? `<label class="lsub" for="pr-${esc(g.id)}">Progression manuelle</label><input type="range" id="pr-${esc(g.id)}" min="0" max="100" step="5" value="${num(g.progress)}" data-goal-progress="${esc(g.id)}">` : '')}
        <div class="item-actions"><button class="btn ghost sm" data-action="step-new" data-id="${esc(g.id)}">${icon('plus', 'sm')}Étape</button>
          ${g.status !== 'done' ? `<button class="btn sm" data-action="goal-done" data-id="${esc(g.id)}">Marquer atteint</button>` : `<button class="btn ghost sm" data-action="goal-reopen" data-id="${esc(g.id)}">Rouvrir</button>`}
          <button class="linkbtn danger" data-action="goal-del" data-id="${esc(g.id)}">Supprimer</button></div>
      </article>`;
    };
    return `<div class="pagehead"><h2>Mes objectifs</h2><button class="btn sm" data-action="goal-new">${icon('plus', 'sm')}Objectif</button></div>
    ${active.length ? `<div class="card"><h3>${active.length} objectif${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}</h3><div class="legend" style="margin-top:0"><span>${pill(`${cnt.good} en bonne voie`)}</span><span>${pill(`${cnt.watch} à surveiller`, 'warn')}</span><span>${pill(`${cnt.late} en retard`, 'off')}</span></div></div>` : ''}
    <div class="chips" role="group" aria-label="Filtrer par catégorie">${filters.map(([k, l]) => `<button class="chip" data-action="goal-filter" data-value="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')}</div>
    ${list.length ? list.map(card).join('') : `<div class="card">${emptyBox(state.goals.length ? 'Aucun objectif dans cette catégorie.' : 'Définis où tu veux aller : un premier objectif suffit pour commencer.', `<button class="btn" data-action="goal-new">Créer un objectif</button>`)}</div>`}`;
  }
  
  /* =====================================================================
     Tâches
     ===================================================================== */
  function pageTasks() {
    const open = state.tasks.filter(t => !t.is_done);
    const late = open.filter(t => t.due_on && daysUntil(t.due_on) < 0);
    const now = open.filter(t => t.due_on && daysUntil(t.due_on) === 0);
    const next = open.filter(t => t.due_on && daysUntil(t.due_on) > 0).sort((a, b) => a.due_on.localeCompare(b.due_on));
    const none = open.filter(t => !t.due_on);
    const done = state.tasks.filter(t => t.is_done).slice(0, 15);
    const sec = (title, list, tone = '') => list.length ? `<div class="card"><div class="card-head"><h3 class="${tone}">${esc(title)}</h3>${pill(String(list.length), tone === 'neg' ? 'off' : 'mute')}</div><div class="list">${list.map(taskRow).join('')}</div></div>` : '';
    return `<div class="pagehead"><h2>Mes tâches</h2><button class="btn sm" data-action="task-new">${icon('plus', 'sm')}Tâche</button></div>
    ${open.length ? sec('En retard', late, 'neg') + sec('Aujourd’hui', now) + sec('À venir', next) + sec('Sans date', none) : `<div class="card">${emptyBox('Rien à faire pour le moment. Ajoute une tâche pour préparer ta journée.', `<button class="btn" data-action="task-new">Ajouter une tâche</button>`)}</div>`}
    ${sec('Terminées récemment', done)}`;
  }
  
  /* =====================================================================
     Habitudes
     ===================================================================== */
  function pageHabits() {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ iso: isoDate(d), l: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) }); }
    const td = today();
    const card = h => {
      const set = new Set(state.logs.filter(l => l.habit_id === h.id).map(l => l.done_on));
      const week = days.filter(d => set.has(d.iso)).length, streak = habitStreak(h.id), doneToday = set.has(td);
      return `<article class="card item">
        <div class="item-head"><div><b class="item-title">${esc(h.name)}</b><span class="lsub">${h.per_week === 7 ? 'Tous les jours' : `${h.per_week} fois par semaine`} · ${week}/${h.per_week} cette semaine</span></div>${streak ? pill(`🔥 ${streak} j`, 'warn') : ''}</div>
        <div class="dots">${days.map(d => `<button class="dot ${set.has(d.iso) ? 'on' : ''} ${d.iso === td ? 'today' : ''}" data-action="habit-toggle" data-id="${esc(h.id)}" data-day="${d.iso}" aria-pressed="${set.has(d.iso)}" aria-label="${esc(fmtDate(d.iso))}">${esc(d.l.toUpperCase())}</button>`).join('')}</div>
        ${bar(pct(week, h.per_week))}
        <div class="item-actions"><button class="btn ${doneToday ? 'ghost' : ''} sm" data-action="habit-toggle" data-id="${esc(h.id)}" data-day="${td}">${doneToday ? 'Fait aujourd’hui ✓' : 'Fait aujourd’hui'}</button><button class="linkbtn danger" data-action="habit-del" data-id="${esc(h.id)}">Supprimer</button></div>
      </article>`;
    };
    return `<div class="pagehead"><h2>Mes habitudes</h2><button class="btn sm" data-action="habit-new">${icon('plus', 'sm')}Habitude</button></div>
    ${state.habits.length ? state.habits.map(card).join('') : `<div class="card">${emptyBox('Une habitude, c’est une action répétée : apprendre, lire, faire du sport… Ajoutes-en une pour suivre ta régularité.', `<button class="btn" data-action="habit-new">Nouvelle habitude</button>`)}</div>`}`;
  }
  
  /* =====================================================================
     Progression
     ===================================================================== */
  function pageProgress() {
    const ms = lastMonths(6), cur = ms[5], prev = ms[4];
    const chg = (a, b) => (b > 0 ? Math.round((a - b) / b * 100) : null);
    const chgTxt = (a, b, goodUp) => { const c = chg(a, b); if (c === null) return ''; const good = goodUp ? c >= 0 : c <= 0; return `<span class="${good ? 'pos' : 'neg'}" style="font-size:12.5px;font-weight:700">${c >= 0 ? '+' : ''}${c} % vs mois dernier</span>`; };
    const tile = (ic, tone, label, value, extra) => `<div class="card stat"><span class="ic ${tone}">${icon(ic)}</span><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span>${extra || ''}</div>`;
    const weekAgo = Date.now() - 7 * 86400000;
    const tasksDone = state.tasks.filter(t => t.is_done && t.done_at && new Date(t.done_at).getTime() >= weekAgo).length;
    const habitDays = new Set(); for (const l of state.logs) if (daysUntil(l.done_on) >= -6) habitDays.add(l.habit_id + l.done_on);
    const goalsDone = state.goals.filter(g => g.status === 'done').length;
    const notes = [];
    if (cur.income || cur.expense) notes.push(cur.income >= cur.expense ? 'Tu dépenses moins que tu ne gagnes ce mois-ci.' : 'Tes dépenses dépassent tes revenus ce mois-ci.');
    if (cur.savings > 0) notes.push(`Tu as mis ${money(cur.savings)} de côté ce mois-ci.`);
    if (cur.debtPaid > 0) notes.push(`Tu as remboursé ${money(cur.debtPaid)} de dettes ce mois-ci.`);
    if (tasksDone) notes.push(`${tasksDone} tâche${tasksDone > 1 ? 's' : ''} terminée${tasksDone > 1 ? 's' : ''} cette semaine.`);
    if (!notes.length) notes.push('Enregistre quelques opérations et tâches : ta progression apparaîtra ici.');
    return `
    <div class="card"><h3>Est-ce que je progresse ?</h3><div class="alerts">${notes.map(n => `<div class="alert ${n.startsWith('Tes dépenses dépassent') ? 'warn' : ''}">${icon('trend')}<span>${esc(n)}</span></div>`).join('')}</div></div>
    <div class="tiles4">
      ${tile('up', 'green', 'Revenus du mois', money(cur.income), chgTxt(cur.income, prev.income, true))}
      ${tile('down', 'red', 'Dépenses du mois', money(cur.expense), chgTxt(cur.expense, prev.expense, false))}
      ${tile('coins', 'blue', 'Épargne du mois', money(cur.savings))}
      ${tile('card', 'amber', 'Dettes remboursées', money(cur.debtPaid))}
    </div>
    <div class="card"><h3>Évolution sur 6 mois</h3>${lineChart(ms.map(x => x.label), [
      { name: 'Revenus', color: '#16A664', values: ms.map(x => x.income) },
      { name: 'Dépenses', color: '#E0685C', values: ms.map(x => x.expense) },
      { name: 'Épargne', color: '#3B82F6', values: ms.map(x => Math.max(0, x.savings)) }])}</div>
    <div class="tiles4">
      ${tile('checkbox', 'green', 'Tâches terminées (7 j)', String(tasksDone))}
      ${tile('flame', 'amber', 'Habitudes cochées (7 j)', String(habitDays.size))}
      ${tile('target', 'blue', 'Objectifs atteints', String(goalsDone))}
      ${tile('trend', 'green', 'Régularité', `${habitStreak(null)} j`)}
    </div>`;
  }
  
  /* =====================================================================
     Profil
     ===================================================================== */
  function pageProfile() {
    const p = state.profile || {};
    return `<div class="two">
      <div class="card"><h3>Informations personnelles</h3>
        <form data-form="profile" novalidate>
          ${fld('Nom complet', 'p-name', inp('p-name', 'display_name', `value="${esc(p.display_name)}" maxlength="80" required`))}
          ${fld('Devise', 'p-cur', sel('p-cur', 'currency', [['XAF', 'FCFA (XAF)'], ['EUR', 'Euro (EUR)'], ['USD', 'Dollar (USD)']], p.currency))}
          <button class="btn" type="submit">Enregistrer</button>
        </form></div>
      <div class="card"><h3>Sécurité</h3>
        <form data-form="password" novalidate>
          ${fld('Nouveau mot de passe', 'pw1', inp('pw1', 'password', 'type="password" autocomplete="new-password"'), '8 caractères minimum')}
          ${fld('Confirmer', 'pw2', inp('pw2', 'password2', 'type="password" autocomplete="new-password"'))}
          <button class="btn" type="submit">Changer le mot de passe</button>
        </form>
        <p style="margin-top:22px"><button class="btn ghost" data-action="logout">${icon('logout')}Se déconnecter</button></p>
      </div></div>`;
  }
  
  /* =====================================================================
     Administration
     ===================================================================== */
  async function loadAdmin() {
    const view = $('#view');
    const [s, u] = await Promise.all([
      state.sb.rpc('admin_platform_stats'),
      state.sb.from('profiles').select('id,display_name,role,status,created_at').order('created_at', { ascending: false }).limit(100)
    ]);
    if (currentPage() !== 'admin') return;
    if (s.error || u.error) { view.innerHTML = `<div class="card"><div class="msg err">${esc(friendlyError(s.error || u.error))}</div></div>`; return; }
    const st = Array.isArray(s.data) ? s.data[0] : s.data;
    const isSuper = state.profile.role === 'super_admin';
    view.innerHTML = `
    <div class="g3">
      ${statCard('users', 'green', 'Utilisateurs', esc(st.total_users))}
      ${statCard('plus', 'blue', 'Nouveaux (30 jours)', esc(st.new_users_30d))}
      ${statCard('flame', 'amber', 'Actifs (7 jours)', esc(st.active_users_7d))}
    </div>
    <div class="card"><h3>Comptes utilisateurs</h3>
      <p class="muted" style="margin:-8px 0 14px">Tu vois les comptes, jamais les données financières personnelles.</p>
      <div class="tablewrap"><table class="table"><thead><tr><th>Nom</th><th>Créé le</th><th>Statut</th><th>Rôle</th><th></th></tr></thead><tbody>
      ${(u.data || []).map(r => {
        const me = r.id === state.userId, canAct = !me && (isSuper || r.role === 'user');
        const roleCell = isSuper && !me && r.role !== 'super_admin'
          ? `<select class="input" style="min-height:40px;padding:6px 10px" data-role-user="${esc(r.id)}" aria-label="Rôle">${['user', 'admin'].map(x => `<option value="${x}" ${r.role === x ? 'selected' : ''}>${x === 'user' ? 'Utilisateur' : 'Admin'}</option>`).join('')}</select>`
          : `<span class="pill role">${r.role === 'super_admin' ? 'Super Admin' : r.role === 'admin' ? 'Admin' : 'Utilisateur'}</span>`;
        return `<tr><td>${esc(r.display_name || '—')}${me ? ' <span class="muted">(toi)</span>' : ''}</td><td>${esc(fmtDate(r.created_at.slice(0, 10)))}</td>
          <td><span class="pill ${r.status === 'active' ? '' : 'off'}">${r.status === 'active' ? 'Actif' : 'Suspendu'}</span></td><td>${roleCell}</td>
          <td>${canAct ? `<button class="linkbtn ${r.status === 'active' ? 'danger' : ''}" data-action="set-status" data-id="${esc(r.id)}" data-status="${r.status === 'active' ? 'suspended' : 'active'}">${r.status === 'active' ? 'Suspendre' : 'Réactiver'}</button>` : ''}</td></tr>`;
      }).join('')}
      </tbody></table></div></div>`;
  }
  
  /* =====================================================================
     Formulaires
     ===================================================================== */
  const opt = s => (s ? s : null);
  const forms = {
    async login(f) {
      const email = v(f, 'email'), password = f.elements.password.value;
      if (!email || !password) return authMsg('Renseigne ton e-mail et ton mot de passe.');
      busy(f, true);
      const { error } = await state.sb.auth.signInWithPassword({ email, password });
      busy(f, false);
      if (error) authMsg(friendlyError(error));
    },
    async signup(f) {
      const name = v(f, 'name'), email = v(f, 'email'), pw = f.elements.password.value;
      if (!name || !email) return authMsg('Renseigne ton nom et ton e-mail.');
      if (pw.length < 8) return authMsg('Le mot de passe doit contenir au moins 8 caractères.');
      if (pw !== f.elements.password2.value) return authMsg('Les mots de passe ne correspondent pas.');
      busy(f, true);
      const { data, error } = await state.sb.auth.signUp({ email, password: pw, options: { data: { display_name: name } } });
      busy(f, false);
      if (error) return authMsg(friendlyError(error));
      if (!data.session) { state.authMode = 'login'; renderAuth(); authMsg('Compte créé. Confirme ton e-mail avec le lien reçu, puis connecte-toi.', true); }
    },
    async tx(f) {
      const amount = num(v(f, 'amount'));
      if (!v(f, 'account_id')) return modalMsg('Choisis un compte.');
      if (!(amount > 0)) return modalMsg('Le montant doit être supérieur à 0.');
      if (!v(f, 'occurred_on')) return modalMsg('Choisis une date.');
      busy(f, true);
      const { error } = await state.sb.from('transactions').insert({ kind: v(f, 'kind'), account_id: v(f, 'account_id'), category_id: opt(v(f, 'category_id')), amount, occurred_on: v(f, 'occurred_on'), note: opt(v(f, 'note')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast(v(f, 'kind') === 'income' ? 'Revenu ajouté' : 'Dépense ajoutée');
      await reload('tx', 'accounts');
      if (currentPage() === 'finance') loadDay();
    },
    async account(f) {
      if (!v(f, 'name')) return modalMsg('Donne un nom au compte.');
      busy(f, true);
      const { error } = await state.sb.from('financial_accounts').insert({ name: v(f, 'name'), type: v(f, 'type'), initial_balance: num(v(f, 'initial_balance')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Compte ajouté'); await reload('accounts');
    },
    async savgoal(f) {
      const target = num(v(f, 'target_amount'));
      if (!v(f, 'name')) return modalMsg('Donne un nom à l’objectif.');
      if (!(target > 0)) return modalMsg('Le montant à atteindre doit être supérieur à 0.');
      busy(f, true);
      const { error } = await state.sb.from('savings_goals').insert({ name: v(f, 'name'), target_amount: target, deadline: opt(v(f, 'deadline')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Objectif créé'); await reload('savings');
    },
    async savmove(f) {
      const amount = num(v(f, 'amount')), kind = v(f, 'kind'), goalId = v(f, 'goal_id');
      if (!(amount > 0)) return modalMsg('Le montant doit être supérieur à 0.');
      if (kind === 'withdrawal' && amount > goalSaved(goalId)) return modalMsg(`Tu ne peux retirer que ${money(goalSaved(goalId))} de cet objectif.`);
      busy(f, true);
      const { error } = await state.sb.from('savings_entries').insert({ goal_id: goalId, kind, amount, occurred_on: v(f, 'occurred_on'), account_id: opt(v(f, 'account_id')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast(kind === 'deposit' ? 'Versement enregistré' : 'Retrait enregistré'); await reload('savings', 'accounts');
    },
    async eng(f) {
      const k = v(f, 'kind'), c = KINDS[k], amount = num(v(f, 'initial_amount'));
      if (!v(f, 'person')) return modalMsg('Renseigne le nom de la personne.');
      if (!(amount > 0)) return modalMsg('Le montant doit être supérieur à 0.');
      const row = { person: v(f, 'person'), initial_amount: amount, due_date: opt(v(f, 'due_date')), notes: opt(v(f, 'notes')) };
      if (c.priority) row.priority = num(v(f, 'priority')) || 2;
      busy(f, true);
      const { error } = await state.sb.from(c.table).insert(row);
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Ajouté'); await reload(k);
    },
    async engpay(f) {
      const k = v(f, 'kind'), c = KINDS[k], id = v(f, 'parent_id'), amount = num(v(f, 'amount'));
      const it = state.eng[k].items.find(x => x.id === id);
      if (!(amount > 0)) return modalMsg('Le montant doit être supérieur à 0.');
      if (it && amount > num(it.remaining) + 0.001) return modalMsg(`Le montant dépasse le reste (${money(it.remaining)}).`);
      busy(f, true);
      const { error } = await state.sb.from(c.pays).insert({ [c.fk]: id, amount, paid_on: v(f, 'paid_on'), account_id: opt(v(f, 'account_id')), note: opt(v(f, 'note')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Mouvement enregistré'); await reload(k, 'accounts');
    },
    async goal(f) {
      if (!v(f, 'title')) return modalMsg('Donne un titre à l’objectif.');
      busy(f, true);
      const { error } = await state.sb.from('goals').insert({ title: v(f, 'title'), description: opt(v(f, 'description')), category: v(f, 'category'), target_date: opt(v(f, 'target_date')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Objectif créé'); await reload('goals');
    },
    async step(f) {
      if (!v(f, 'title')) return modalMsg('Décris l’étape.');
      const gid = v(f, 'goal_id');
      busy(f, true);
      const { error } = await state.sb.from('goal_steps').insert({ goal_id: gid, title: v(f, 'title'), position: state.steps.filter(s => s.goal_id === gid).length });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); await reload('goals');
    },
    async task(f) {
      if (!v(f, 'title')) return modalMsg('Décris la tâche.');
      busy(f, true);
      const { error } = await state.sb.from('tasks').insert({ title: v(f, 'title'), due_on: opt(v(f, 'due_on')), priority: num(v(f, 'priority')) || 2, goal_id: opt(v(f, 'goal_id')) });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Tâche ajoutée'); await reload('tasks');
    },
    async habit(f) {
      if (!v(f, 'name')) return modalMsg('Donne un nom à l’habitude.');
      busy(f, true);
      const { error } = await state.sb.from('habits').insert({ name: v(f, 'name'), per_week: num(v(f, 'per_week')) || 7 });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal(); toast('Habitude ajoutée'); await reload('habits');
    },
    async profile(f) {
      if (!v(f, 'display_name')) return toast('Le nom ne peut pas être vide.', true);
      busy(f, true);
      const { error } = await state.sb.from('profiles').update({ display_name: v(f, 'display_name'), currency: v(f, 'currency') }).eq('id', state.userId);
      busy(f, false);
      if (error) return toast(friendlyError(error), true);
      state.profile.display_name = v(f, 'display_name'); state.profile.currency = v(f, 'currency');
      toast('Profil enregistré'); buildChrome(); route(true);
    },
    async password(f) {
      const pw = f.elements.password.value;
      if (pw.length < 8) return toast('8 caractères minimum.', true);
      if (pw !== f.elements.password2.value) return toast('Les mots de passe ne correspondent pas.', true);
      busy(f, true);
      const { error } = await state.sb.auth.updateUser({ password: pw });
      busy(f, false);
      if (error) return toast(friendlyError(error), true);
      f.reset(); toast('Mot de passe modifié');
    }
  };
  
  /* =====================================================================
     Actions (clics)
     ===================================================================== */
  async function del(table, id, group, extra = []) {
    const { error } = await state.sb.from(table).delete().eq('id', id);
    if (error) return toast(friendlyError(error), true);
    toast('Supprimé'); await reload(group, ...extra);
  }
  async function patch(table, id, values, group) {
    const { error } = await state.sb.from(table).update(values).eq('id', id);
    if (error) return toast(friendlyError(error), true);
    await reload(group);
  }
  
  const actions = {
    logout: async () => { closeSheet(); await state.sb.auth.signOut(); location.hash = ''; },
    'auth-mode': el => { state.authMode = el.dataset.mode; renderAuth(); },
    forgot: async () => {
      const email = $('#f-email')?.value.trim();
      if (!email) return authMsg('Saisis ton e-mail ci-dessus, puis clique sur « Mot de passe oublié ».');
      const { error } = await state.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      authMsg(error ? friendlyError(error) : 'Si un compte existe, un lien de réinitialisation vient d’être envoyé.', !error);
    },
    'close-modal': closeModal,
    'close-sheet': closeSheet,
    'open-menu': () => openSheet(menuHtml()),
    'quick-add': () => openSheet(quickHtml()),
    'tx-income': el => { closeSheet(); txModal('income', el.dataset.date); },
    'tx-expense': el => { closeSheet(); txModal('expense', el.dataset.date); },
    'add-account': () => accountModal(),
    'archive-account': async el => {
      if (!confirm('Archiver ce compte ? Il disparaît de la liste, ses opérations sont conservées.')) return;
      await patch('financial_accounts', el.dataset.id, { is_archived: true }, 'accounts');
      toast('Compte archivé');
    },
    'del-tx': async el => { if (confirm('Supprimer cette opération ?')) { await del('transactions', el.dataset.id, 'tx', ['accounts']); if (currentPage() === 'finance') loadDay(); } },
    'day-prev': () => shiftDay(-1),
    'day-next': () => shiftDay(1),
    'day-today': () => { state.day = today(); loadDay(); },
    'pick-day': el => { state.day = el.dataset.day; loadDay(); window.scrollTo(0, 0); },
    'sav-new': () => savGoalModal(),
    'sav-deposit': el => { closeSheet(); savMoveModal('deposit', el.dataset.goal); },
    'sav-withdraw': el => savMoveModal('withdrawal', el.dataset.goal),
    'sav-archive': async el => { if (confirm('Archiver cet objectif d’épargne ?')) await patch('savings_goals', el.dataset.id, { is_archived: true }, 'savings'); },
    'eng-new': el => engModal(el.dataset.kind),
    'eng-pay': el => engPayModal(el.dataset.kind, el.dataset.id),
    'eng-history': el => engHistoryModal(el.dataset.kind, el.dataset.id),
    'eng-del': async el => { if (confirm('Supprimer cet élément et son historique ?')) await del(KINDS[el.dataset.kind].table, el.dataset.id, el.dataset.kind, ['accounts']); },
    'eng-paydel': async el => {
      const k = el.dataset.kind;
      if (!confirm('Supprimer ce mouvement ?')) return;
      closeModal(); await del(KINDS[k].pays, el.dataset.id, k, ['accounts']);
    },
    'goal-new': () => goalModal(),
    'goal-filter': el => { state.goalFilter = el.dataset.value; route(true); },
    'goal-done': el => patch('goals', el.dataset.id, { status: 'done', progress: 100 }, 'goals'),
    'goal-reopen': el => patch('goals', el.dataset.id, { status: 'active' }, 'goals'),
    'goal-del': async el => { if (confirm('Supprimer cet objectif et ses étapes ?')) await del('goals', el.dataset.id, 'goals', ['tasks']); },
    'step-new': el => stepModal(el.dataset.id),
    'step-del': el => del('goal_steps', el.dataset.id, 'goals'),
    'step-toggle': async el => {
      const s = state.steps.find(x => x.id === el.dataset.id); if (!s) return;
      s.is_done = !s.is_done; route(true);
      const { error } = await state.sb.from('goal_steps').update({ is_done: s.is_done }).eq('id', s.id);
      if (error) { s.is_done = !s.is_done; route(true); toast(friendlyError(error), true); }
    },
    'task-new': () => { closeSheet(); taskModal(); },
    'task-del': el => del('tasks', el.dataset.id, 'tasks'),
    'task-toggle': async el => {
      const t = state.tasks.find(x => x.id === el.dataset.id); if (!t) return;
      const prev = { is_done: t.is_done, done_at: t.done_at };
      t.is_done = !t.is_done; t.done_at = t.is_done ? new Date().toISOString() : null; route(true);
      const { error } = await state.sb.from('tasks').update({ is_done: t.is_done, done_at: t.done_at }).eq('id', t.id);
      if (error) { Object.assign(t, prev); route(true); toast(friendlyError(error), true); }
    },
    'habit-new': () => habitModal(),
    'habit-del': async el => { if (confirm('Supprimer cette habitude et son historique ?')) await patch('habits', el.dataset.id, { is_archived: true }, 'habits'); },
    'habit-toggle': async el => {
      const id = el.dataset.id, day = el.dataset.day;
      const idx = state.logs.findIndex(l => l.habit_id === id && l.done_on === day);
      let error;
      if (idx >= 0) {
        state.logs.splice(idx, 1); route(true);
        ({ error } = await state.sb.from('habit_logs').delete().eq('habit_id', id).eq('done_on', day));
      } else {
        state.logs.push({ id: 'tmp-' + id + day, habit_id: id, done_on: day }); route(true);
        ({ error } = await state.sb.from('habit_logs').insert({ habit_id: id, done_on: day }));
      }
      if (error) { toast(friendlyError(error), true); await reload('habits'); }
    },
    'set-status': async el => {
      const { error } = await state.sb.rpc('set_user_status', { target: el.dataset.id, new_status: el.dataset.status });
      if (error) return toast(friendlyError(error), true);
      toast('Statut mis à jour'); loadAdmin();
    }
  };
  
  document.addEventListener('click', async e => {
    if (e.target.id === 'sheet') return closeSheet();
    if (e.target.closest('a.tile')) closeSheet();
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    try { await fn(el); } catch (err) { console.error(err); toast(friendlyError(err), true); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    try { await forms[f.dataset.form]?.(f); } catch (err) { console.error(err); busy(f, false); toast(friendlyError(err), true); }
  });
  document.addEventListener('change', async e => {
    const di = e.target.closest('#day-input');
    if (di) { if (di.value) { state.day = di.value; loadDay(); } return; }
    const pr = e.target.closest('input[data-goal-progress]');
    if (pr) {
      const g = state.goals.find(x => x.id === pr.dataset.goalProgress); if (!g) return;
      g.progress = num(pr.value);
      const { error } = await state.sb.from('goals').update({ progress: g.progress }).eq('id', g.id);
      if (error) toast(friendlyError(error), true); else route(true);
      return;
    }
    const s = e.target.closest('select[data-role-user]');
    if (!s) return;
    const { error } = await state.sb.rpc('set_user_role', { target: s.dataset.roleUser, new_role: s.value });
    if (error) toast(friendlyError(error), true); else toast('Rôle mis à jour');
    loadAdmin();
  });
  
  init();
  })();
  