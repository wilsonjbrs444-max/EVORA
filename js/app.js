(() => {
  'use strict';
  
  const cfg = window.EVORA_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  
  const state = {
    sb: null, userId: null, profile: null,
    accounts: [], allAccounts: [], categories: [], txs: [],
    authMode: 'login', day: ''
  };
  
  /* ---------- Icônes ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    wallet: '<path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M3 7l12-3v3"/><circle cx="17" cy="13.5" r="1"/>',
    bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M17 5a3.5 3.5 0 010 7M22 20c0-3-2-4.7-5-5.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'
  };
  const icon = n => `<svg class="svg" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const LOGO = `<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="8" height="3" rx="1.5" fill="#fff"/><rect x="4" y="10.5" width="12" height="3" rx="1.5" fill="#fff"/><rect x="4" y="16" width="16" height="3" rx="1.5" fill="#fff"/></svg></span><span>EVORA</span>`;
  
  /* ---------- Utilitaires ---------- */
  const pad = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const num = v => Number(v) || 0;
  const currency = () => state.profile?.currency || 'XAF';
  const money = n => {
    const c = currency();
    const label = c === 'XAF' ? 'FCFA' : c;
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num(n))} ${label}`.replace(/\u202f/g, ' ');
  };
  const fmtDate = s => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const firstName = () => (state.profile?.display_name || '').trim().split(/\s+/)[0] || 'toi';
  const ACC_TYPES = { mobile_money: 'Mobile Money', bank: 'Banque', cash: 'Espèces', other: 'Autre' };
  const COLORS = ['#16A664', '#3B82F6', '#F0A39B', '#E0A21C', '#8B5CF6', '#14B8A6', '#94A3B8'];
  
  function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }
  function friendlyError(e) {
    const m = String(e?.message || e || '');
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/already registered|already been registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail.';
    if (/Email not confirmed/i.test(m)) return 'Confirme ton e-mail via le lien reçu avant de te connecter.';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
    if (/Réservé|Impossible|Seul le Super Admin|introuvable/i.test(m)) return m;
    if (/violates foreign key/i.test(m)) return 'Ce compte contient des opérations : archive-le plutôt que de le supprimer.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Connexion impossible. Vérifie ton réseau et réessaie.';
    return 'Une erreur est survenue. Réessaie.';
  }
  function busy(form, on) {
    const b = form.querySelector('button[type=submit]');
    if (b) b.disabled = on;
  }
  
  /* ---------- Démarrage ---------- */
  function showFatal(msg) {
    const a = $('#auth');
    a.hidden = false;
    a.style.display = 'grid';
    a.style.placeItems = 'center';
    a.innerHTML = `<div class="auth-card"><h3>Impossible de démarrer EVORA</h3><p class="sub">${esc(msg)}</p></div>`;
  }
  
  function init() {
    state.day = isoDate(new Date());
    const ok = v => v && !String(v).startsWith('COLLE_ICI');
    if (!ok(cfg.SUPABASE_URL) || !ok(cfg.SUPABASE_ANON_KEY)) {
      const a = $('#auth');
      a.hidden = false;
      a.style.display = 'grid';
      a.style.placeItems = 'center';
      a.innerHTML = `<div class="auth-card"><h3>Configuration requise</h3>
        <p class="sub">Ouvre <b>js/config.js</b> et colle l'URL du projet et la clé anon Supabase (Project Settings &gt; API).</p></div>`;
      return;
    }
    if (!window.supabase) {
      return showFatal('La bibliothèque Supabase n’a pas pu se charger. Vérifie ta connexion internet, puis recharge la page.');
    }
    try {
      state.sb = window.supabase.createClient(cfg.SUPABASE_URL.trim(), cfg.SUPABASE_ANON_KEY.trim());
    } catch (e) {
      return showFatal('L’URL ou la clé dans js/config.js est invalide. L’URL doit commencer par https:// et se terminer par .supabase.co.');
    }
    state.sb.auth.onAuthStateChange((event, session) => {
      // setTimeout : évite tout appel Supabase bloquant à l'intérieur du callback
      setTimeout(() => handleSession(event, session), 0);
    });
    window.addEventListener('hashchange', route);
  }
  
  async function handleSession(event, session) {
    if (!session) {
      state.userId = null; state.profile = null;
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
  
  async function loadAll() {
    const since = new Date();
    since.setDate(1);
    since.setMonth(since.getMonth() - 5);
    const [p, a, c, t] = await Promise.all([
      state.sb.from('profiles').select('*').eq('id', state.userId).single(),
      state.sb.from('account_balances').select('*').order('name'),
      state.sb.from('categories').select('*').order('name'),
      state.sb.from('transactions').select('*').gte('occurred_on', isoDate(since))
        .order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(1000)
    ]);
    const err = p.error || a.error || c.error || t.error;
    if (err) { toast(friendlyError(err), true); return false; }
    state.profile = p.data;
    state.allAccounts = a.data || [];
    state.accounts = state.allAccounts.filter(x => !x.is_archived);
    state.categories = c.data || [];
    state.txs = t.data || [];
    return true;
  }
  async function refresh() {
    await loadAll();
    route();
  }
  
  /* ---------- Authentification ---------- */
  function renderAuth() {
    const a = $('#auth');
    a.hidden = false;
    a.removeAttribute('style');
    const signup = state.authMode === 'signup';
    const hero = signup
      ? { h: 'Ton avenir commence par une bonne gestion d’aujourd’hui.', p: 'Rejoins des personnes qui construisent une meilleure vie, étape par étape.' }
      : { h: 'Prends le contrôle de ta vie financière et de tes objectifs.', p: 'Une application pour gérer ton argent, organiser ton quotidien et atteindre tes ambitions.' };
    const feats = [['wallet', 'Suivi de tes finances'], ['target', 'Gestion de tes objectifs'], ['check', 'Organisation et habitudes'], ['chart', 'Statistiques et progression']];
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
  
  const forms = {
    async login(f) {
      const email = f.email.value.trim(), password = f.password.value;
      if (!email || !password) return authMsg('Renseigne ton e-mail et ton mot de passe.');
      busy(f, true);
      const { error } = await state.sb.auth.signInWithPassword({ email, password });
      busy(f, false);
      if (error) authMsg(friendlyError(error));
    },
    async signup(f) {
      const name = f.name.value.trim(), email = f.email.value.trim(), pw = f.password.value;
      if (!name || !email) return authMsg('Renseigne ton nom et ton e-mail.');
      if (pw.length < 8) return authMsg('Le mot de passe doit contenir au moins 8 caractères.');
      if (pw !== f.password2.value) return authMsg('Les mots de passe ne correspondent pas.');
      busy(f, true);
      const { data, error } = await state.sb.auth.signUp({ email, password: pw, options: { data: { display_name: name } } });
      busy(f, false);
      if (error) return authMsg(friendlyError(error));
      if (!data.session) {
        state.authMode = 'login';
        renderAuth();
        authMsg('Compte créé. Confirme ton e-mail avec le lien reçu, puis connecte-toi.', true);
      }
    },
    async tx(f) {
      const amount = num(f.amount.value);
      if (!f.account_id.value) return modalMsg('Choisis un compte.');
      if (!(amount > 0)) return modalMsg('Le montant doit être supérieur à 0.');
      if (!f.occurred_on.value) return modalMsg('Choisis une date.');
      busy(f, true);
      const { error } = await state.sb.from('transactions').insert({
        kind: f.kind.value, account_id: f.account_id.value, category_id: f.category_id.value || null,
        amount, occurred_on: f.occurred_on.value, note: f.note.value.trim() || null
      });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal();
      toast(f.kind.value === 'income' ? 'Revenu ajouté' : 'Dépense ajoutée');
      refresh();
    },
    async account(f) {
      const name = f.name.value.trim();
      if (!name) return modalMsg('Donne un nom au compte.');
      busy(f, true);
      const { error } = await state.sb.from('financial_accounts').insert({
        name, type: f.type.value, initial_balance: num(f.initial_balance.value)
      });
      busy(f, false);
      if (error) return modalMsg(friendlyError(error));
      closeModal();
      toast('Compte ajouté');
      refresh();
    },
    async profile(f) {
      const display_name = f.display_name.value.trim();
      if (!display_name) return toast('Le nom ne peut pas être vide.', true);
      busy(f, true);
      const { error } = await state.sb.from('profiles').update({ display_name, currency: f.currency.value }).eq('id', state.userId);
      busy(f, false);
      if (error) return toast(friendlyError(error), true);
      toast('Profil enregistré');
      refresh();
      buildChrome();
    },
    async password(f) {
      const pw = f.password.value;
      if (pw.length < 8) return toast('8 caractères minimum.', true);
      if (pw !== f.password2.value) return toast('Les mots de passe ne correspondent pas.', true);
      busy(f, true);
      const { error } = await state.sb.auth.updateUser({ password: pw });
      busy(f, false);
      if (error) return toast(friendlyError(error), true);
      f.reset();
      toast('Mot de passe modifié');
    }
  };
  
  /* ---------- Modale ---------- */
  function openModal(html) { const d = $('#modal'); d.innerHTML = html; d.showModal(); }
  function closeModal() { const d = $('#modal'); if (d.open) d.close(); }
  function modalMsg(t) { const el = $('#modal .modalmsg'); if (el) el.innerHTML = `<div class="msg err">${esc(t)}</div>`; }
  
  function txModal(kind, date) {
    if (!state.accounts.length) {
      toast('Ajoute d’abord un compte pour enregistrer une opération.', true);
      location.hash = '#/comptes';
      return;
    }
    const cats = state.categories.filter(c => c.kind === kind);
    openModal(`
      <h3>${kind === 'income' ? 'Ajouter un revenu' : 'Ajouter une dépense'}</h3>
      <form data-form="tx" novalidate>
        <div class="modalmsg"></div>
        <input type="hidden" name="kind" value="${kind}">
        <div class="row2">
          <div class="field"><label for="m-amount">Montant (${currency() === 'XAF' ? 'FCFA' : esc(currency())})</label><input class="input" id="m-amount" name="amount" type="number" inputmode="decimal" min="0" step="any" required></div>
          <div class="field"><label for="m-date">Date</label><input class="input" id="m-date" name="occurred_on" type="date" value="${esc(date || isoDate(new Date()))}" required></div>
        </div>
        <div class="row2">
          <div class="field"><label for="m-acc">Compte</label><select class="input" id="m-acc" name="account_id">${state.accounts.map(a => `<option value="${esc(a.account_id)}">${esc(a.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="m-cat">Catégorie</label><select class="input" id="m-cat" name="category_id"><option value="">Sans catégorie</option>${cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="m-note">Description (facultatif)</label><input class="input" id="m-note" name="note" maxlength="140"></div>
        <div class="actions"><button type="button" class="btn ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">Enregistrer</button></div>
      </form>`);
  }
  function accountModal() {
    openModal(`
      <h3>Ajouter un compte</h3>
      <form data-form="account" novalidate>
        <div class="modalmsg"></div>
        <div class="field"><label for="a-name">Nom du compte</label><input class="input" id="a-name" name="name" maxlength="60" placeholder="Ex. MTN Mobile Money" required></div>
        <div class="row2">
          <div class="field"><label for="a-type">Type</label><select class="input" id="a-type" name="type">${Object.entries(ACC_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="field"><label for="a-bal">Solde actuel</label><input class="input" id="a-bal" name="initial_balance" type="number" inputmode="decimal" step="any" value="0"></div>
        </div>
        <div class="actions"><button type="button" class="btn ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">Ajouter</button></div>
      </form>`);
  }
  
  /* ---------- Coque & routage ---------- */
  const NAV = [
    { id: 'accueil', label: 'Accueil', icon: 'home' },
    { id: 'finance', label: 'Finance', icon: 'chart' },
    { id: 'comptes', label: 'Comptes', icon: 'wallet' },
    { id: 'epargne', label: 'Épargne', icon: 'coins' },
    { id: 'dettes', label: 'Dettes', icon: 'card' },
    { id: 'objectifs', label: 'Objectifs', icon: 'target' },
    { id: 'taches', label: 'Tâches', icon: 'check' },
    { id: 'habitudes', label: 'Habitudes', icon: 'flame' },
    { id: 'progression', label: 'Progression', icon: 'chart' },
    { id: 'admin', label: 'Administration', icon: 'shield', admin: true }
  ];
  const MOBILE_NAV = ['accueil', 'finance', 'objectifs', 'profil'];
  const isAdmin = () => ['admin', 'super_admin'].includes(state.profile?.role);
  
  function buildChrome() {
    $('.brand', $('.sidebar')).innerHTML = LOGO;
    const items = NAV.filter(n => !n.admin || isAdmin());
    $('#nav').innerHTML = items.map(n => `<a href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`).join('');
    const all = [...NAV, { id: 'profil', label: 'Profil', icon: 'user' }];
    $('#bottomnav').innerHTML = MOBILE_NAV.map(id => {
      const n = all.find(x => x.id === id);
      return `<a href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`;
    }).join('');
    const nm = state.profile?.display_name || '';
    $('#uname').textContent = nm;
    $('#avatar').textContent = (nm.trim()[0] || '?').toUpperCase();
    $('[data-action=logout]').innerHTML = icon('logout');
  }
  
  function route() {
    if (!state.userId || $('#app').hidden) return;
    const parts = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/');
    const page = parts[0], sub = parts[1] || '';
    const titles = { accueil: 'Accueil', finance: 'Finance', comptes: 'Comptes financiers', profil: 'Mon profil', admin: 'Administration' };
    const view = $('#view');
    let html;
    switch (page) {
      case 'accueil': html = pageDashboard(); break;
      case 'finance': html = pageFinance(sub); break;
      case 'comptes': html = pageAccounts(); break;
      case 'profil': html = pageProfile(); break;
      case 'admin': html = isAdmin() ? '<div class="empty">Chargement…</div>' : soon('Administration', 'Cet espace est réservé aux administrateurs.'); break;
      default: {
        const n = NAV.find(x => x.id === page);
        html = n ? soon(n.label) : pageDashboard();
      }
    }
    const nav = NAV.find(x => x.id === page);
    $('#page-title').textContent = titles[page] || nav?.label || 'Accueil';
    document.title = `${$('#page-title').textContent} — EVORA`;
    view.innerHTML = html;
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (page === 'admin' && isAdmin()) loadAdmin();
    if (page === 'finance' && !['mois', 'revenus', 'depenses'].includes(sub)) loadDay();
    window.scrollTo(0, 0);
  }
  
  /* ---------- Calculs ---------- */
  function monthStats(key = monthKey(new Date())) {
    let income = 0, expense = 0;
    for (const t of state.txs) if (t.occurred_on.startsWith(key)) { if (t.kind === 'income') income += num(t.amount); else expense += num(t.amount); }
    return { income, expense };
  }
  const totalBalance = () => state.accounts.reduce((s, a) => s + num(a.balance), 0);
  function last6() {
    const now = new Date(), out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'short' }), income: 0, expense: 0 });
    }
    for (const t of state.txs) { const m = out.find(x => t.occurred_on.startsWith(x.key)); if (m) m[t.kind] += num(t.amount); }
    return out;
  }
  function nextMove() {
    const { income, expense } = monthStats();
    if (!state.accounts.length) return { tone: '', title: 'Ajoute ton premier compte', text: 'Mobile Money, banque ou espèces : EVORA calcule ton solde à partir de tes comptes.', btn: 'Ajouter un compte', href: '#/comptes' };
    if (!income && !expense) return { tone: 'info', title: 'Enregistre ta première opération', text: 'Un revenu ou une dépense suffit pour démarrer le suivi du mois.', btn: 'Ajouter une dépense', action: 'tx-expense' };
    if (expense > income) return { tone: 'warn', title: 'Tes dépenses dépassent tes revenus ce mois-ci', text: `Écart de ${money(expense - income)}. Regarde la répartition pour repérer ce qui pèse le plus.`, btn: 'Voir la répartition', href: '#/finance/mois' };
    return { tone: '', title: 'Ton mois est équilibré', text: `Tu as encore ${money(income - expense)} de marge ce mois-ci.`, btn: 'Voir les détails', href: '#/finance/mois' };
  }
  
  /* ---------- Pages ---------- */
  const stat = (ic, tone, label, value, extra = '') => `<div class="card stat"><span class="ic ${tone}">${icon(ic)}</span><span class="label">${label}</span><span class="value">${value}</span>${extra}</div>`;
  const lockedStat = (ic, label) => `<div class="card stat locked"><span class="ic green">${icon(ic)}</span><span class="label">${label}</span><span class="value">—</span><span class="soon">Bientôt</span></div>`;
  
  function pageDashboard() {
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const m = nextMove();
    const recent = state.txs.slice(0, 5);
    const tdKey = isoDate(new Date());
    let tdIn = 0, tdOut = 0;
    for (const t of state.txs) if (t.occurred_on === tdKey) { if (t.kind === 'income') tdIn += num(t.amount); else tdOut += num(t.amount); }
    const btn = m.href ? `<a class="btn sm" href="${m.href}">${esc(m.btn)}</a>` : `<button class="btn sm" data-action="${m.action}">${esc(m.btn)}</button>`;
    return `
    <div class="greet"><h2>Bonjour ${esc(firstName())} 👋</h2><p>${esc(today)}</p></div>
    <div class="grid g5">
      ${stat('wallet', 'green', 'Solde disponible', money(totalBalance()))}
      ${lockedStat('coins', 'Épargne')}
      ${lockedStat('card', 'Dettes')}
      ${lockedStat('down', 'À recevoir')}
      ${lockedStat('users', 'Confié à d’autres')}
    </div>
    <div class="grid g21" style="margin-top:16px">
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Aujourd’hui</h3><a class="linkbtn" href="#/finance">Voir le détail</a></div>
          <div class="grid g3">
            <div class="mini"><span class="label">Entrées</span><span class="value pos">${esc(money(tdIn))}</span></div>
            <div class="mini"><span class="label">Sorties</span><span class="value neg">${esc(money(tdOut))}</span></div>
            <div class="mini"><span class="label">Bilan du jour</span><span class="value ${tdIn - tdOut >= 0 ? 'pos' : 'neg'}">${esc(money(tdIn - tdOut))}</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn sm" data-action="tx-income">Ajouter un revenu</button><button class="btn ghost sm" data-action="tx-expense">Ajouter une dépense</button></div>
        </div>
        <div class="card callout"><h3>Mon prochain mouvement</h3>
          <div class="box ${m.tone}"><div><b>${esc(m.title)}</b><span class="muted">${esc(m.text)}</span></div></div>
          <div>${btn}</div>
        </div>
        <div class="card"><div class="card-head"><h3>Dernières opérations</h3><a class="linkbtn" href="#/finance">Tout voir</a></div>
          ${recent.length ? txTable(recent, false) : `<div class="empty"><span>Aucune opération pour le moment.</span><button class="btn sm" data-action="tx-expense">Ajouter une dépense</button></div>`}
        </div>
      </div>
      <div class="stack">
        <div class="card"><h3>Priorités du jour</h3><div class="empty"><span class="soon">Bientôt</span><span>Tes tâches du jour apparaîtront ici.</span></div></div>
        <div class="card"><h3>Ma régularité</h3><div class="empty"><span class="soon">Bientôt</span><span>Suis tes habitudes jour après jour.</span></div></div>
      </div>
    </div>`;
  }
  
  function financeTabs(sub) {
    const t = [['', 'Jour'], ['mois', 'Mois'], ['revenus', 'Revenus'], ['depenses', 'Dépenses']];
    return `<div class="tabs" role="tablist">${t.map(([k, l]) => `<a href="#/finance${k ? '/' + k : ''}" ${sub === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</div>`;
  }
  function txTable(list, withDelete = true) {
    const cat = id => state.categories.find(c => c.id === id)?.name || '—';
    const acc = id => state.allAccounts.find(a => a.account_id === id)?.name || '—';
    return `<div class="tablewrap"><table class="table"><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Compte</th><th class="amt">Montant</th>${withDelete ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(t => `<tr><td>${esc(fmtDate(t.occurred_on))}</td><td>${esc(t.note || cat(t.category_id))}</td><td>${esc(cat(t.category_id))}</td><td>${esc(acc(t.account_id))}</td>
      <td class="amt ${t.kind === 'income' ? 'pos' : 'neg'}">${t.kind === 'income' ? '+' : '−'}${esc(money(t.amount))}</td>
      ${withDelete ? `<td><button class="linkbtn danger" data-action="del-tx" data-id="${esc(t.id)}" aria-label="Supprimer l’opération">Supprimer</button></td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
  }
  
  function pageFinance(sub) {
    if (sub !== 'mois' && sub !== 'revenus' && sub !== 'depenses') {
      return `${financeTabs('')}<div id="dayview"><div class="empty">Chargement…</div></div>`;
    }
    if (sub === 'revenus' || sub === 'depenses') {
      const kind = sub === 'revenus' ? 'income' : 'expense';
      const list = state.txs.filter(t => t.kind === kind);
      return `${financeTabs(sub)}
      <div class="pagehead"><h2>${kind === 'income' ? 'Revenus' : 'Dépenses'}</h2><button class="btn" data-action="tx-${kind}">${icon('plus')}${kind === 'income' ? 'Ajouter un revenu' : 'Ajouter une dépense'}</button></div>
      <div class="card">${list.length ? txTable(list) : `<div class="empty"><span>${kind === 'income' ? 'Aucun revenu enregistré sur les 6 derniers mois.' : 'Aucune dépense enregistrée sur les 6 derniers mois.'}</span></div>`}</div>`;
    }
    const { income, expense } = monthStats();
    const bars = last6();
    const max = Math.max(1, ...bars.map(b => Math.max(b.income, b.expense)));
    const chart = `<div class="bars" role="img" aria-label="Revenus et dépenses des 6 derniers mois">${bars.map(b => `<div class="m"><div class="pair"><span class="bar i" style="height:${(b.income / max * 100).toFixed(1)}%"></span><span class="bar e" style="height:${(b.expense / max * 100).toFixed(1)}%"></span></div><span class="lab">${esc(b.label)}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>Revenus</span><span><i style="background:#F0A39B"></i>Dépenses</span></div>`;
  
    const key = monthKey(new Date()), byCat = {};
    for (const t of state.txs) if (t.kind === 'expense' && t.occurred_on.startsWith(key)) {
      const n = state.categories.find(c => c.id === t.category_id)?.name || 'Sans catégorie';
      byCat[n] = (byCat[n] || 0) + num(t.amount);
    }
    const items = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    let donut;
    if (!items.length) {
      donut = `<div class="empty"><span>Aucune dépense ce mois-ci. Ajoute-en une pour voir la répartition.</span><button class="btn sm" data-action="tx-expense">Ajouter une dépense</button></div>`;
    } else {
      const total = items.reduce((s, i) => s + i.value, 0);
      let acc = 0;
      const stops = items.map((it, i) => { const s = acc; acc += it.value / total * 100; return `${COLORS[i % COLORS.length]} ${s.toFixed(2)}% ${acc.toFixed(2)}%`; }).join(',');
      donut = `<div class="donutbox"><div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="Répartition des dépenses du mois"></div>
        <div class="dlegend">${items.map((it, i) => `<div><i style="background:${COLORS[i % COLORS.length]}"></i><span>${esc(it.name)}</span><span>${Math.round(it.value / total * 100)}%</span></div>`).join('')}</div></div>`;
    }
    return `${financeTabs('mois')}
    <div class="pagehead"><h2>Ce mois-ci</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-action="tx-expense">${icon('plus')}Dépense</button><button class="btn" data-action="tx-income">${icon('plus')}Revenu</button></div></div>
    <div class="grid g3">
      ${stat('up', 'green', 'Total des entrées', `<span class="pos">${esc(money(income))}</span>`)}
      ${stat('down', 'red', 'Total des sorties', `<span class="neg">${esc(money(expense))}</span>`)}
      ${stat('wallet', 'blue', 'Solde du mois', `<span class="${income - expense >= 0 ? 'pos' : 'neg'}">${esc(money(income - expense))}</span>`)}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Évolution sur 6 mois</h3>${chart}</div>
      <div class="card"><h3>Répartition des dépenses</h3>${donut}</div>
    </div>`;
  }
  
  function pageAccounts() {
    const total = totalBalance();
    const cards = state.accounts.map(a => `<div class="card acc"><div class="top"><span class="ic green" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center">${icon(a.type === 'bank' ? 'bank' : 'wallet')}</span>${esc(a.name)}</div>
      <span class="muted">${esc(ACC_TYPES[a.type] || 'Autre')}</span><span class="bal">${esc(money(a.balance))}</span></div>`).join('');
    return `<div class="pagehead"><h2>Mes comptes</h2><button class="btn" data-action="add-account">${icon('plus')}Ajouter un compte</button></div>
    ${state.accounts.length ? `<div class="grid g3">${cards}<div class="card acc total-card"><span class="muted">Total disponible</span><span class="bal pos">${esc(money(total))}</span></div></div>
    <div class="card" style="margin-top:16px"><h3>Détail des comptes</h3><div class="tablewrap"><table class="table"><thead><tr><th>Nom</th><th>Type</th><th class="amt">Solde</th><th></th></tr></thead><tbody>
    ${state.accounts.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(ACC_TYPES[a.type] || 'Autre')}</td><td class="amt">${esc(money(a.balance))}</td><td><button class="linkbtn danger" data-action="archive-account" data-id="${esc(a.account_id)}">Archiver</button></td></tr>`).join('')}
    </tbody></table></div></div>` : `<div class="card"><div class="empty"><span>Tu n’as pas encore de compte. Ajoute MTN Mobile Money, Orange Money, ta banque ou tes espèces.</span><button class="btn" data-action="add-account">Ajouter un compte</button></div></div>`}`;
  }
  
  function pageProfile() {
    const p = state.profile || {};
    return `<div class="grid g2">
      <div class="card"><h3>Informations personnelles</h3>
        <form data-form="profile" novalidate>
          <div class="field"><label for="p-name">Nom complet</label><input class="input" id="p-name" name="display_name" value="${esc(p.display_name)}" maxlength="80" required></div>
          <div class="field"><label for="p-cur">Devise</label><select class="input" id="p-cur" name="currency">
            ${[['XAF', 'FCFA (XAF)'], ['EUR', 'Euro (EUR)'], ['USD', 'Dollar (USD)']].map(([v, l]) => `<option value="${v}" ${p.currency === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <button class="btn" type="submit">Enregistrer</button>
        </form></div>
      <div class="card"><h3>Sécurité</h3>
        <form data-form="password" novalidate>
          <div class="field"><label for="pw1">Nouveau mot de passe</label><input class="input" id="pw1" name="password" type="password" autocomplete="new-password"><span class="hint">8 caractères minimum</span></div>
          <div class="field"><label for="pw2">Confirmer</label><input class="input" id="pw2" name="password2" type="password" autocomplete="new-password"></div>
          <button class="btn" type="submit">Changer le mot de passe</button>
        </form>
        <p style="margin-top:22px"><button class="btn ghost" data-action="logout">${icon('logout')}Se déconnecter</button></p>
      </div></div>`;
  }
  
  function soon(title, text) {
    return `<div class="card"><div class="empty"><span class="ic green" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center">${icon('lock')}</span>
      <h3>${esc(title)}</h3><p>${esc(text || 'Ce module arrive bientôt dans EVORA.')}</p></div></div>`;
  }
  
  /* ---------- Vue "Jour" ---------- */
  function shiftDay(n) {
    const [y, m, d] = state.day.split('-').map(Number);
    state.day = isoDate(new Date(y, m - 1, d + n));
    loadDay();
  }
  
  async function loadDay() {
    const day = state.day;
    const [y, m] = day.split('-').map(Number);
    const start = `${y}-${pad(m)}-01`;
    const end = isoDate(new Date(y, m, 0));
    const { data, error } = await state.sb.from('transactions').select('*')
      .gte('occurred_on', start).lte('occurred_on', end).order('created_at', { ascending: false });
    const box = $('#dayview');
    if (!box || day !== state.day) return;
    if (error) { box.innerHTML = `<div class="card"><div class="msg err">${esc(friendlyError(error))}</div></div>`; return; }
    box.innerHTML = dayView(data || []);
  }
  
  function dayView(monthTxs) {
    const day = state.day;
    const today = isoDate(new Date());
    const [y, m, d] = day.split('-').map(Number);
    const longDate = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const list = monthTxs.filter(t => t.occurred_on === day);
    const sum = (arr, k) => arr.filter(t => t.kind === k).reduce((s, t) => s + num(t.amount), 0);
    const inc = sum(list, 'income'), exp = sum(list, 'expense');
  
    const byDay = {};
    for (const t of monthTxs) {
      if (!byDay[t.occurred_on]) byDay[t.occurred_on] = { income: 0, expense: 0 };
      byDay[t.occurred_on][t.kind] += num(t.amount);
    }
    const days = Object.keys(byDay).sort().reverse();
    const mIn = days.reduce((s, k) => s + byDay[k].income, 0);
    const mOut = days.reduce((s, k) => s + byDay[k].expense, 0);
    const rows = days.map(k => `<tr class="${k === day ? 'sel' : ''}">
      <td><button class="linkbtn" data-action="pick-day" data-day="${esc(k)}">${esc(fmtDate(k))}</button></td>
      <td class="amt pos">${esc(money(byDay[k].income))}</td><td class="amt neg">${esc(money(byDay[k].expense))}</td>
      <td class="amt">${esc(money(byDay[k].income - byDay[k].expense))}</td></tr>`).join('');
  
    return `
    <div class="daynav">
      <button class="btn ghost sm" data-action="day-prev" aria-label="Jour précédent">‹</button>
      <input class="input" type="date" id="day-input" value="${esc(day)}" aria-label="Choisir un jour">
      <button class="btn ghost sm" data-action="day-next" aria-label="Jour suivant">›</button>
      ${day !== today ? '<button class="btn ghost sm" data-action="day-today">Aujourd’hui</button>' : ''}
    </div>
    <div class="pagehead"><h2>${esc(longDate)} ${day === today ? '<span class="soon">Aujourd’hui</span>' : ''}</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" data-action="tx-expense" data-date="${esc(day)}">${icon('plus')}Dépense</button>
        <button class="btn" data-action="tx-income" data-date="${esc(day)}">${icon('plus')}Revenu</button>
      </div></div>
    <div class="grid g3">
      ${stat('up', 'green', 'Entrées du jour', `<span class="pos">${esc(money(inc))}</span>`)}
      ${stat('down', 'red', 'Sorties du jour', `<span class="neg">${esc(money(exp))}</span>`)}
      ${stat('wallet', 'blue', 'Bilan du jour', `<span class="${inc - exp >= 0 ? 'pos' : 'neg'}">${esc(money(inc - exp))}</span>`)}
    </div>
    <div class="card" style="margin-top:16px"><h3>Opérations de ce jour</h3>
      ${list.length ? txTable(list) : '<div class="empty"><span>Aucune opération ce jour-là. Ajoute un revenu ou une dépense avec les boutons ci-dessus.</span></div>'}
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Jour par jour, ${esc(monthLabel)}</h3><a class="linkbtn" href="#/finance/mois">Voir la vue du mois</a></div>
      ${days.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>Jour</th><th class="amt">Entrées</th><th class="amt">Sorties</th><th class="amt">Bilan</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td><b>Total du mois</b></td><td class="amt pos"><b>${esc(money(mIn))}</b></td><td class="amt neg"><b>${esc(money(mOut))}</b></td><td class="amt"><b>${esc(money(mIn - mOut))}</b></td></tr></tfoot></table></div>` : '<div class="empty"><span>Aucune opération ce mois-ci.</span></div>'}
    </div>`;
  }
  
  /* ---------- Administration ---------- */
  async function loadAdmin() {
    const view = $('#view');
    const [s, u] = await Promise.all([
      state.sb.rpc('admin_platform_stats'),
      state.sb.from('profiles').select('id,display_name,role,status,created_at').order('created_at', { ascending: false }).limit(100)
    ]);
    if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'admin') return;
    if (s.error || u.error) { view.innerHTML = `<div class="card"><div class="msg err">${esc(friendlyError(s.error || u.error))}</div></div>`; return; }
    const st = Array.isArray(s.data) ? s.data[0] : s.data;
    const isSuper = state.profile.role === 'super_admin';
    view.innerHTML = `
    <div class="grid g3">
      ${stat('users', 'green', 'Utilisateurs', esc(st.total_users))}
      ${stat('plus', 'blue', 'Nouveaux (30 jours)', esc(st.new_users_30d))}
      ${stat('flame', 'amber', 'Actifs (7 jours)', esc(st.active_users_7d))}
    </div>
    <div class="card" style="margin-top:16px"><h3>Comptes utilisateurs</h3>
      <p class="muted" style="margin:-8px 0 14px">Tu vois les comptes, jamais les données financières personnelles.</p>
      <div class="tablewrap"><table class="table"><thead><tr><th>Nom</th><th>Créé le</th><th>Statut</th><th>Rôle</th><th></th></tr></thead><tbody>
      ${(u.data || []).map(r => {
        const me = r.id === state.userId;
        const canAct = !me && (isSuper || r.role === 'user');
        const roleCell = isSuper && !me && r.role !== 'super_admin'
          ? `<select class="input" style="padding:6px" data-role-user="${esc(r.id)}" aria-label="Rôle">${['user', 'admin'].map(v => `<option value="${v}" ${r.role === v ? 'selected' : ''}>${v === 'user' ? 'Utilisateur' : 'Admin'}</option>`).join('')}</select>`
          : `<span class="pill role">${r.role === 'super_admin' ? 'Super Admin' : r.role === 'admin' ? 'Admin' : 'Utilisateur'}</span>`;
        return `<tr><td>${esc(r.display_name || '—')}${me ? ' <span class="muted">(toi)</span>' : ''}</td><td>${esc(fmtDate(r.created_at.slice(0, 10)))}</td>
          <td><span class="pill ${r.status === 'active' ? '' : 'off'}">${r.status === 'active' ? 'Actif' : 'Suspendu'}</span></td><td>${roleCell}</td>
          <td>${canAct ? `<button class="linkbtn ${r.status === 'active' ? 'danger' : ''}" data-action="set-status" data-id="${esc(r.id)}" data-status="${r.status === 'active' ? 'suspended' : 'active'}">${r.status === 'active' ? 'Suspendre' : 'Réactiver'}</button>` : ''}</td></tr>`;
      }).join('')}
      </tbody></table></div></div>`;
  }
  
  /* ---------- Événements ---------- */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    try {
      if (a === 'logout') { await state.sb.auth.signOut(); location.hash = ''; }
      else if (a === 'auth-mode') { state.authMode = el.dataset.mode; renderAuth(); }
      else if (a === 'forgot') {
        const email = $('#f-email')?.value.trim();
        if (!email) return authMsg('Saisis ton e-mail ci-dessus, puis clique sur « Mot de passe oublié ».');
        const { error } = await state.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        authMsg(error ? friendlyError(error) : 'Si un compte existe, un lien de réinitialisation vient d’être envoyé.', !error);
      }
      else if (a === 'tx-income') txModal('income', el.dataset.date);
      else if (a === 'tx-expense') txModal('expense', el.dataset.date);
      else if (a === 'add-account') accountModal();
      else if (a === 'close-modal') closeModal();
      else if (a === 'day-prev') shiftDay(-1);
      else if (a === 'day-next') shiftDay(1);
      else if (a === 'day-today') { state.day = isoDate(new Date()); loadDay(); }
      else if (a === 'pick-day') { state.day = el.dataset.day; loadDay(); window.scrollTo(0, 0); }
      else if (a === 'del-tx') {
        if (!confirm('Supprimer cette opération ?')) return;
        const { error } = await state.sb.from('transactions').delete().eq('id', el.dataset.id);
        if (error) return toast(friendlyError(error), true);
        toast('Opération supprimée'); refresh();
      }
      else if (a === 'archive-account') {
        if (!confirm('Archiver ce compte ? Il disparaîtra de la liste, ses opérations sont conservées.')) return;
        const { error } = await state.sb.from('financial_accounts').update({ is_archived: true }).eq('id', el.dataset.id);
        if (error) return toast(friendlyError(error), true);
        toast('Compte archivé'); refresh();
      }
      else if (a === 'set-status') {
        const { error } = await state.sb.rpc('set_user_status', { target: el.dataset.id, new_status: el.dataset.status });
        if (error) return toast(friendlyError(error), true);
        toast('Statut mis à jour'); loadAdmin();
      }
    } catch (err) { toast(friendlyError(err), true); }
  });
  
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    try { await forms[f.dataset.form]?.(f); } catch (err) { busy(f, false); toast(friendlyError(err), true); }
  });
  
  document.addEventListener('change', async e => {
    const di = e.target.closest('#day-input');
    if (di) { if (di.value) { state.day = di.value; loadDay(); } return; }
    const s = e.target.closest('select[data-role-user]');
    if (!s) return;
    const { error } = await state.sb.rpc('set_user_role', { target: s.dataset.roleUser, new_role: s.value });
    if (error) toast(friendlyError(error), true); else toast('Rôle mis à jour');
    loadAdmin();
  });
  
  init();
  })();
  