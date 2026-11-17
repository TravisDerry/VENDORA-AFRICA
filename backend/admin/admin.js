// Vendora Admin page. All data is inserted with textContent (never innerHTML), so business names
// and messages typed by users can't inject code into this page.
// Layout: tables + sidebar on laptops, cards + top tabs on phones (CSS decides which is shown).
(() => {
  const API = '/api/admin';
  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem('vendoraAdminToken') || '';
  let currentTab = 'overview';
  let bizFilter = 'pending';
  let supportStatus = 'open';
  let searchTimer = null;

  const PAGES = {
    overview: ['Overview', 'What needs your attention and how Vendora is doing'],
    businesses: ['Businesses', 'Check businesses, give the Verified badge, and help owners'],
    support: ['Support messages', 'Messages sent from the app\'s Help & support page'],
    payments: ['Payments', 'Latest successful payments'],
    settings: ['Settings', 'Monthly prices and your admin password'],
  };

  // ---------- helpers ----------
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return node;
  };
  // replaceChildren without the empty (null/false) entries
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
  const ghs = (n) => { const v = Number(n || 0); return `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`; };
  const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const digits = (p) => String(p || '').replace(/[^\d]/g, '').replace(/^0/, '233');
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 2800); };
  const modal = (...content) => { fill($('modalBody'), ...content); $('modal').hidden = false; };
  // Line icons (24x24, drawn with the current text colour). Built with createElementNS: no innerHTML.
  const ICON_PATHS = {
    shield: ['M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
    message: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z', 'M8 11h8', 'M8 14h5'],
    clock: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7v5l3 2'],
    store: ['M3 9l2-5h14l2 5', 'M3 9h18', 'M5 9v11h14V9', 'M10 20v-6h4v6'],
    verified: ['M12 3l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z', 'M9 12l2 2 4-4'],
    gift: ['M4 11h16v9H4z', 'M3 7h18v4H3z', 'M12 7v13', 'M12 7C10.5 4 7 4 7 6s3 1 5 1c1.5-3 5-3 5-1s-3 1-5 1'],
    card: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
    hidden: ['M3 3l18 18', 'M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-2.6 3.2', 'M6.6 7.6C4.4 9.1 3 12 3 12s4 6 9 6a9 9 0 0 0 4-.9', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    wallet: ['M3 7h15a3 3 0 0 1 3 3v8H3z', 'M3 7l12-3v3', 'M16 13h2'],
    bag: ['M5 8h14l-1 12H6z', 'M9 8V6a3 3 0 0 1 6 0v2'],
    arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  };
  const icon = (name, size = 20) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    [['viewBox', '0 0 24 24'], ['width', size], ['height', size], ['fill', 'none'], ['stroke', 'currentColor'],
      ['stroke-width', '1.8'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']]
      .forEach(([k, v]) => svg.setAttribute(k, v));
    (ICON_PATHS[name] || []).forEach((d) => { const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); svg.append(path); });
    return svg;
  };
  const loading = (box) => fill(box, el('p', { class: 'muted', text: 'Loading…' }));
  const failed = (box, err) => fill(box, el('p', { class: 'error', text: err.message }));
  $('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) $('modal').hidden = true; });

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') { logout(); throw new Error(json.error || 'Please log in again'); }
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
    return json;
  }

  // ---------- login ----------
  function showLogin() { $('login').hidden = false; $('app').hidden = true; setTimeout(() => $('password').focus(), 0); }
  function showApp() { $('login').hidden = true; $('app').hidden = false; go('overview'); }
  function logout() { token = ''; sessionStorage.removeItem('vendoraAdminToken'); showLogin(); }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const { token: t } = await api('/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
      token = t;
      sessionStorage.setItem('vendoraAdminToken', t);
      $('password').value = '';
      showApp();
    } catch (err) {
      $('loginError').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $('logout').addEventListener('click', logout);

  // ---------- navigation ----------
  const loaders = { overview: loadOverview, businesses: loadBusinesses, support: loadSupport, payments: loadPayments, settings: loadSettings };
  function go(tab, opts = {}) {
    currentTab = tab;
    if (tab === 'businesses' && opts.filter) {
      bizFilter = opts.filter;
      document.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('on', x.dataset.filter === bizFilter));
    }
    if (tab === 'support' && opts.status) {
      supportStatus = opts.status;
      document.querySelectorAll('[data-status]').forEach((x) => x.classList.toggle('on', x.dataset.status === supportStatus));
    }
    document.querySelectorAll('.tabs button').forEach((x) => { x.classList.toggle('on', x.dataset.tab === tab); x.setAttribute('aria-selected', x.dataset.tab === tab); });
    document.querySelectorAll('.tab').forEach((s) => { s.hidden = s.id !== `tab-${tab}`; });
    $('pageTitle').textContent = PAGES[tab][0];
    $('pageSub').textContent = PAGES[tab][1];
    loaders[tab]();
    if (tab !== 'overview') refreshBadges();
  }
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  $('refresh').addEventListener('click', () => go(currentTab));

  const setBadge = (id, n) => { const b = $(id); b.textContent = n; b.hidden = !n; };
  async function refreshBadges() {
    try { const s = await api('/summary'); setBadge('pendingBadge', s.pendingVerification); setBadge('supportBadge', s.openSupport); } catch (e) { /* ignore */ }
  }

  // ---------- overview ----------
  async function loadOverview() {
    const box = $('tab-overview');
    loading(box);
    try {
      const s = await api('/summary');
      setBadge('pendingBadge', s.pendingVerification);
      setBadge('supportBadge', s.openSupport);
      // Number card: label + icon on top, the figure, then a footer (status note and/or "View" link).
      // tone sets the icon colour; "go" makes the whole card open a section.
      const stat = (value, label, opts = {}) => {
        const card = el('div', {
          class: `stat tone-${opts.tone || 'navy'}${opts.go ? ' clickable' : ''}`,
          onclick: opts.go, role: opts.go ? 'button' : null, tabindex: opts.go ? '0' : null,
          'aria-label': opts.go ? `${label}: ${value}. Open` : null,
        },
        el('div', { class: 'stat-top' },
          el('span', { class: 'stat-label', text: label }),
          el('div', { class: 'stat-icon' }, icon(opts.icon))),
        el('div', { class: 'stat-value', text: value }),
        (opts.note || opts.go) ? el('div', { class: 'stat-foot' },
          opts.note ? el('span', { class: `stat-note note-${opts.noteTone || 'muted'}`, text: opts.note }) : el('span'),
          opts.go ? el('span', { class: 'stat-link' }, 'View', icon('arrow', 14)) : null) : null);
        if (opts.go) card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.go(); } });
        return card;
      };
      // Footer for the "needs attention" cards
      const attention = (n) => (n ? { note: 'Action needed', noteTone: 'amber' } : { note: 'All clear', noteTone: 'green' });

      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const todo = [
        s.pendingVerification ? `${s.pendingVerification} business${s.pendingVerification === 1 ? '' : 'es'} to verify` : null,
        s.openSupport ? `${s.openSupport} message${s.openSupport === 1 ? '' : 's'} to answer` : null,
        s.listing.grace ? `${s.listing.grace} overdue payment${s.listing.grace === 1 ? '' : 's'}` : null,
      ].filter(Boolean);

      fill(box,
        el('div', { class: 'welcome' },
          el('div', {},
            el('div', { class: 'welcome-date', text: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }),
            el('h2', { text: greeting }),
            el('p', { text: todo.length ? `Today: ${todo.join(' · ')}.` : 'Everything is up to date. Nothing needs your attention right now.' })),
          el('div', { class: 'welcome-figures' },
            el('div', {}, el('b', { text: s.businesses }), el('span', { text: 'Businesses' })),
            el('div', {}, el('b', { text: ghs(s.listingRevenue.total) }), el('span', { text: 'Earned' })))),
        el('div', { class: 'section-title', text: 'Needs your attention' }),
        el('div', { class: 'stats attention' },
          stat(s.pendingVerification, 'Waiting for verification', { tone: s.pendingVerification ? 'amber' : 'green', icon: 'shield', ...attention(s.pendingVerification), go: () => go('businesses', { filter: 'pending' }) }),
          stat(s.openSupport, 'Open support messages', { tone: s.openSupport ? 'amber' : 'green', icon: 'message', ...attention(s.openSupport), go: () => go('support', { status: 'open' }) }),
          stat(s.listing.grace, 'Payment overdue (grace)', { tone: s.listing.grace ? 'red' : 'green', icon: 'clock', ...(s.listing.grace ? { note: 'Follow up', noteTone: 'red' } : { note: 'All clear', noteTone: 'green' }) })),
        el('div', { class: 'section-title', text: 'Businesses' }),
        el('div', { class: 'stats biz-stats' },
          stat(s.businesses, 'Total businesses', { tone: 'navy', icon: 'store', go: () => go('businesses', { filter: 'all' }) }),
          stat(s.verified, 'Verified', { tone: 'green', icon: 'verified', go: () => go('businesses', { filter: 'verified' }) }),
          stat(s.listing.trial, 'In free month', { tone: 'blue', icon: 'gift' }),
          stat(s.listing.active, 'Paid & active', { tone: 'green', icon: 'card' }),
          stat(s.listing.expired, 'Hidden (unpaid)', { tone: s.listing.expired ? 'red' : 'grey', icon: 'hidden' })),
        el('div', { class: 'section-title', text: 'Money · real payments only' }),
        el('div', { class: 'stats money-row' },
          stat(ghs(s.listingRevenue.total), 'Listing fees to Vendora', { tone: 'green', icon: 'wallet', note: `${s.listingRevenue.count} payment${s.listingRevenue.count === 1 ? '' : 's'}` }),
          stat(ghs(s.customerPayments.total), 'Customers paid businesses', { tone: 'purple', icon: 'bag', note: `${s.customerPayments.count} payment${s.customerPayments.count === 1 ? '' : 's'}`, go: () => go('payments') })),
        s.testPayments ? el('p', { class: 'muted small', text: `${s.testPayments} test-mode payment(s) are not counted.` }) : null,
      );
    } catch (err) {
      failed(box, err);
    }
  }

  // ---------- businesses ----------
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    bizFilter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('on', x === b));
    loadBusinesses();
  }));
  $('bizSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadBusinesses, 350); });

  const listingTag = (l) => {
    const map = { trial: ['Free month', 'blue'], active: ['Paid', 'green'], grace: ['Payment due', 'amber'], expired: ['Hidden', 'red'] };
    const [label, tone] = map[l?.status] || ['Active', 'green'];
    return el('span', { class: `tag ${tone}`, text: l?.daysLeft != null && l.status !== 'expired' ? `${label} · ${l.daysLeft}d` : label });
  };
  const statusTag = (b) => (b.verified ? el('span', { class: 'tag green', text: 'Verified' }) : el('span', { class: 'tag amber', text: 'Waiting' }));

  const bizActions = (b) => {
    const phone = digits(b.phone);
    return el('div', { class: 'actions' },
      phone ? el('a', { href: `tel:+${phone}`, text: 'Call' }) : null,
      phone ? el('a', { class: 'wa', href: `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${b.ownerName || ''}, this is Vendora Africa. We'd like to confirm your business "${b.name}" so it can get the Verified badge.`)}`, target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null,
      b.verified
        ? el('button', { class: 'danger', text: 'Remove badge', onclick: () => setVerified(b, false) })
        : el('button', { class: 'success', text: 'Verify', onclick: () => askVerify(b) }),
      el('button', { class: 'outline', text: 'New owner key', onclick: () => newKey(b) }));
  };

  const bizCard = (b) => el('div', { class: `item stripe-${b.verified ? 'green' : 'amber'}` },
    el('div', { class: 'item-head' },
      el('div', {}, el('h3', { text: b.name }), el('div', { class: 'meta', text: `${b.category} · ${[b.city, b.country].filter(Boolean).join(', ') || 'no location'} · joined ${day(b.createdAt)}` })),
      statusTag(b)),
    el('div', { class: 'meta', text: `Owner: ${b.ownerName || '-'} · ${b.phone || 'no phone'} · ${b.email || 'no email'}` }),
    el('div', { class: 'meta' }, listingTag(b.listing), ` ${b.products} product(s) · ${b.hasPhoto ? 'has photo' : 'no photo'} · ${b.acceptsPayments ? 'takes MoMo' : 'no MoMo yet'}`),
    b.verified && (b.verifiedAt || b.verificationNote) ? el('div', { class: 'meta', text: `Verified ${day(b.verifiedAt)}${b.verificationNote ? ` — ${b.verificationNote}` : ''}` }) : null,
    bizActions(b));

  const bizRow = (b) => el('tr', { class: b.verified ? 'row-ok' : 'row-wait' },
    el('td', {},
      el('div', { class: 'name', text: b.name }),
      el('div', { class: 'sub', text: `${b.category} · ${[b.city, b.country].filter(Boolean).join(', ') || 'no location'}` }),
      el('div', { class: 'sub', text: `Joined ${day(b.createdAt)}` })),
    el('td', {},
      el('div', { text: b.ownerName || '-' }),
      el('div', { class: 'sub', text: b.phone || 'no phone' }),
      el('div', { class: 'sub', text: b.email || 'no email' })),
    el('td', {},
      listingTag(b.listing),
      el('div', { class: 'sub', text: `${b.products} product(s) · ${b.hasPhoto ? 'photo' : 'no photo'}` }),
      el('div', { class: 'sub', text: b.acceptsPayments ? 'Takes MoMo' : 'No MoMo yet' })),
    el('td', {},
      statusTag(b),
      b.verified && (b.verifiedAt || b.verificationNote) ? el('div', { class: 'sub', text: `${day(b.verifiedAt)}${b.verificationNote ? ` — ${b.verificationNote}` : ''}` }) : null),
    el('td', {}, bizActions(b)));

  async function loadBusinesses() {
    const box = $('bizList');
    loading(box);
    try {
      const q = $('bizSearch').value.trim();
      const { businesses } = await api(`/businesses?filter=${bizFilter}${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      if (!businesses.length) {
        fill(box, el('p', { class: 'empty', text: bizFilter === 'pending' && !q ? 'No businesses waiting to be checked.' : 'No businesses found.' }));
        return;
      }
      fill(box,
        el('p', { class: 'muted small', text: `${businesses.length} business${businesses.length === 1 ? '' : 'es'}` }),
        el('div', { class: 'cards' }, businesses.map(bizCard)),
        el('div', { class: 'table-wrap' },
          el('table', {},
            el('thead', {}, el('tr', {}, ['Business', 'Owner & contact', 'Listing', 'Verification', 'Actions'].map((h) => el('th', { text: h })))),
            el('tbody', {}, businesses.map(bizRow)))));
    } catch (err) {
      failed(box, err);
    }
  }

  function askVerify(biz) {
    const note = el('textarea', { placeholder: 'Optional note for your records, e.g. "Called owner, visited shop in Osu"' });
    modal(
      el('h2', { text: `Verify ${biz.name}?` }),
      el('p', { class: 'muted small', text: 'Only verify after checking the business is real (call, visit or a photo of the shop). Customers will see the Verified badge.' }),
      el('label', { text: 'Note (private)' }), note,
      el('button', { class: 'success full', text: 'Yes, verify', onclick: async (e) => { e.target.disabled = true; await setVerified(biz, true, note.value); $('modal').hidden = true; } }),
    );
    note.focus();
  }

  async function setVerified(biz, on, note) {
    if (!on && !confirm(`Remove the Verified badge from ${biz.name}?`)) return;
    try {
      const { business } = await api(`/businesses/${biz.id}/${on ? 'verify' : 'unverify'}`, { method: 'POST', body: JSON.stringify({ note: note || '' }) });
      toast(on ? `${business.name} is now Verified` : `Badge removed from ${business.name}`);
      loadBusinesses();
      refreshBadges();
    } catch (err) {
      toast(err.message);
    }
  }

  async function newKey(biz) {
    if (!confirm(`Create a NEW owner key for ${biz.name}?\n\nOnly do this after confirming you're talking to the real owner. Their old key stops working immediately.`)) return;
    try {
      const { ownerKey } = await api(`/businesses/${biz.id}/owner-key`, { method: 'POST' });
      const phone = digits(biz.phone);
      const text = `Hello ${biz.ownerName || ''}, here is your new Vendora Africa owner key for ${biz.name}:\n${ownerKey}\n\nIn the app: Account > Manage my business > search your business > paste this key. Keep it private.`;
      modal(
        el('h2', { text: 'New owner key' }),
        el('p', { class: 'muted small', text: `For ${biz.name}. Shown only once: send it to the owner now.` }),
        el('div', { class: 'key', text: ownerKey }),
        el('div', { class: 'actions' },
          el('button', { class: 'outline', text: 'Copy key', onclick: async () => { try { await navigator.clipboard.writeText(ownerKey); toast('Copied'); } catch (e) { toast('Select the key and copy it'); } } }),
          phone ? el('a', { class: 'wa', href: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener', text: 'Send on WhatsApp' }) : null),
      );
    } catch (err) {
      toast(err.message);
    }
  }

  // ---------- support ----------
  document.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => {
    supportStatus = b.dataset.status;
    document.querySelectorAll('[data-status]').forEach((x) => x.classList.toggle('on', x === b));
    loadSupport();
  }));

  const TOPICS = { account: 'Owner key / account', payments: 'Payments', listing: 'Listing', orders: 'An order', report: 'Report a business', other: 'Other' };

  async function loadSupport() {
    const box = $('supportList');
    loading(box);
    try {
      const { requests } = await api(`/support?status=${supportStatus}`);
      if (!requests.length) { fill(box, el('p', { class: 'empty', text: supportStatus === 'open' ? 'No open messages.' : 'No messages yet.' })); return; }
      fill(box, el('div', { class: 'grid2' }, requests.map(supportCard)));
    } catch (err) {
      failed(box, err);
    }
  }

  function supportCard(r) {
    const card = el('div', { class: 'item' });
    const phone = digits(r.phone);
    const render = (status) => {
      card.className = `item stripe-${status === 'open' ? (r.topic === 'report' ? 'red' : 'amber') : 'green'}`;
      fill(card,
        el('div', { class: 'item-head' },
          el('div', {}, el('h3', { text: `${r.name}${r.businessName ? ` · ${r.businessName}` : ''}` }), el('div', { class: 'meta', text: `${r.reference} · ${TOPICS[r.topic] || r.topic} · ${when(r.createdAt)}` })),
          el('span', { class: `tag ${status === 'open' ? 'amber' : 'green'}`, text: status === 'open' ? 'Open' : 'Resolved' })),
        el('div', { class: 'msg', text: r.message }),
        el('div', { class: 'meta', text: `Reply to: ${[r.phone, r.email].filter(Boolean).join(' · ')}` }),
        el('div', { class: 'actions' },
          phone ? el('a', { href: `tel:+${phone}`, text: 'Call' }) : null,
          phone ? el('a', { class: 'wa', href: `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${r.name}, this is Vendora Africa about your message ${r.reference}.`)}`, target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null,
          r.email ? el('a', { href: `mailto:${r.email}?subject=${encodeURIComponent(`Vendora Africa – ${r.reference}`)}`, text: 'Email' }) : null,
          el('button', {
            class: status === 'open' ? 'success' : 'outline',
            text: status === 'open' ? 'Mark resolved' : 'Reopen',
            onclick: async () => {
              try {
                const res = await api(`/support/${encodeURIComponent(r.reference)}/${status === 'open' ? 'resolve' : 'reopen'}`, { method: 'POST' });
                render(res.status);
                refreshBadges();
              } catch (err) { toast(err.message); }
            },
          })),
      );
    };
    render(r.status);
    return card;
  }

  // ---------- payments ----------
  async function loadPayments() {
    const box = $('paymentList');
    loading(box);
    try {
      const { payments } = await api('/payments');
      if (!payments.length) { fill(box, el('p', { class: 'empty', text: 'No successful payments yet.' })); return; }
      const what = (p) => (p.purpose === 'order' ? `${p.customerName || 'Customer'} → ${p.businessName}` : `${p.businessName} · listing fee`);
      const kind = (p) => el('span', { class: `tag ${p.purpose === 'order' ? 'blue' : 'green'}`, text: p.purpose === 'order' ? 'Customer order' : 'Listing fee' });
      fill(box,
        el('div', { class: 'cards' }, el('div', { class: 'item' }, payments.map((p) => el('div', { class: 'item-head', style: 'padding:10px 0;border-top:1px solid #E8EEF5' },
          el('div', {}, el('strong', { text: what(p) }), el('div', { class: 'meta', text: `${p.productName ? `${p.productName} · ` : ''}${String(p.provider).toUpperCase()} · ${when(p.paidAt)}` })),
          el('div', { style: 'text-align:right' }, el('strong', { text: ghs(p.amount) }), p.testMode ? el('div', {}, el('span', { class: 'tag amber', text: 'Test' })) : null))))),
        el('div', { class: 'table-wrap' },
          el('table', {},
            el('thead', {}, el('tr', {}, ['Date', 'Type', 'Details', 'Network', 'Reference', 'Amount'].map((h) => el('th', { text: h })))),
            el('tbody', {}, payments.map((p) => el('tr', {},
              el('td', { text: when(p.paidAt) }),
              el('td', {}, kind(p), p.testMode ? el('div', { class: 'sub' }, el('span', { class: 'tag amber', text: 'Test' })) : null),
              el('td', {}, el('div', { class: 'name', text: what(p) }), p.productName ? el('div', { class: 'sub', text: p.productName }) : null),
              el('td', { text: String(p.provider).toUpperCase() }),
              el('td', {}, el('code', { text: p.reference })),
              el('td', { class: 'num', text: ghs(p.amount) })))))));
    } catch (err) {
      failed(box, err);
    }
  }

  // ---------- settings: prices + admin password ----------
  async function loadSettings() {
    const box = $('tab-settings');
    loading(box);
    try {
      const s = await api('/settings');
      fill(box, el('div', { class: 'settings-grid' }, pricingCard(s.pricing), passwordCard(s.password)));
    } catch (err) {
      failed(box, err);
    }
  }

  const numberInput = (value, opts) => el('input', {
    type: 'number', inputmode: opts.decimal ? 'decimal' : 'numeric', min: String(opts.min), max: String(opts.max),
    step: opts.decimal ? '0.01' : '1', value: String(value), 'aria-label': opts.label, required: 'required',
  });

  function pricingCard(p) {
    const inputs = {};
    const err = el('p', { class: 'error', role: 'alert' });
    const rows = p.categories.map((c) => {
      inputs[c.id] = numberInput(c.price, { decimal: true, min: p.limits.minPrice, max: p.limits.maxPrice, label: `${c.name} price in GHS` });
      return el('div', { class: 'price-row' },
        el('div', {}, el('div', { class: 'name', text: c.name }), c.price !== c.defaultPrice ? el('div', { class: 'sub', text: `Default GHS ${c.defaultPrice}` }) : null),
        el('div', { class: 'money-input' }, el('span', { text: 'GHS' }), inputs[c.id]));
    });
    const freeDays = numberInput(p.freeDays, { min: 0, max: p.limits.maxFreeDays, label: 'Free days for new businesses' });
    const graceDays = numberInput(p.graceDays, { min: 0, max: p.limits.maxGraceDays, label: 'Grace days after a missed payment' });
    const btn = el('button', { class: 'primary', type: 'submit', text: 'Save prices' });

    const form = el('form', {
      class: 'item settings-card',
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = '';
        const prices = Object.fromEntries(Object.entries(inputs).map(([id, i]) => [id, i.value.trim() === '' ? NaN : Number(i.value)]));
        const bad = Object.entries(prices).find(([, v]) => !Number.isFinite(v));
        if (bad) { err.textContent = 'Fill in every price.'; inputs[bad[0]].focus(); return; }
        const changes = p.categories.filter((c) => prices[c.id] !== c.price).map((c) => `${c.name}: GHS ${c.price} → GHS ${prices[c.id]}`);
        if (Number(freeDays.value) !== p.freeDays) changes.push(`Free days: ${p.freeDays} → ${freeDays.value}`);
        if (Number(graceDays.value) !== p.graceDays) changes.push(`Grace days: ${p.graceDays} → ${graceDays.value}`);
        if (!changes.length) { toast('Nothing changed'); return; }
        if (!confirm(`Save these changes? They show on the website and app straight away.\n\n${changes.join('\n')}`)) return;
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const s = await api('/settings/pricing', { method: 'PUT', body: JSON.stringify({ prices, freeDays: Number(freeDays.value), graceDays: Number(graceDays.value) }) });
          form.replaceWith(pricingCard(s.pricing));
          toast('Prices saved');
        } catch (ex) {
          err.textContent = ex.message;
          btn.disabled = false; btn.textContent = 'Save prices';
        }
      },
    },
    el('div', { class: 'item-head' }, el('div', {}, el('h3', { text: 'Monthly prices' }), el('div', { class: 'meta', text: 'What each business type pays per month after its free days.' }))),
    el('div', { class: 'price-list' }, rows),
    el('div', { class: 'section-title', text: 'Free and grace period' }),
    el('div', { class: 'price-row' }, el('div', {}, el('div', { class: 'name', text: 'Free days' }), el('div', { class: 'sub', text: 'For newly approved businesses' })), el('div', { class: 'money-input' }, freeDays, el('span', { text: 'days' }))),
    el('div', { class: 'price-row' }, el('div', {}, el('div', { class: 'name', text: 'Grace days' }), el('div', { class: 'sub', text: 'Still listed after a missed payment' })), el('div', { class: 'money-input' }, graceDays, el('span', { text: 'days' }))),
    el('p', { class: 'note', text: 'New prices apply from each business\'s next payment. Businesses in their free month or a paid month keep it. Changing the free days only affects businesses approved after you save. Grace days apply to every business straight away.' }),
    err, btn);
    return form;
  }

  function passwordCard(pw) {
    const field = (id, label, autocomplete) => [el('label', { for: id, text: label }), el('input', { id, type: 'password', autocomplete, required: 'required', maxlength: '128' })];
    const err = el('p', { class: 'error', role: 'alert' });
    const btn = el('button', { class: 'primary', type: 'submit', text: 'Change password' });
    const form = el('form', {
      class: 'item settings-card',
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = '';
        const current = $('pwCurrent').value;
        const next = $('pwNew').value;
        if (next.length < pw.minLength) { err.textContent = `The new password must be at least ${pw.minLength} characters.`; return; }
        if (next !== $('pwConfirm').value) { err.textContent = 'The two new passwords do not match.'; return; }
        if (next === current) { err.textContent = 'The new password must be different from the current one.'; return; }
        btn.disabled = true; btn.textContent = 'Changing…';
        try {
          await api('/settings/password', { method: 'POST', body: JSON.stringify({ current, next }) });
          form.reset();
          logout();
          $('loginError').textContent = '';
          toast('Password changed. Log in with your new password.');
        } catch (ex) {
          err.textContent = ex.message;
          btn.disabled = false; btn.textContent = 'Change password';
        }
      },
    },
    el('div', { class: 'item-head' }, el('div', {}, el('h3', { text: 'Admin password' }),
      el('div', { class: 'meta', text: pw.source === 'admin' ? `Last changed ${when(pw.changedAt)}` : 'Currently the password from the server set-up (.env).' }))),
    field('pwCurrent', 'Current password', 'current-password'),
    field('pwNew', `New password (at least ${pw.minLength} characters)`, 'new-password'),
    field('pwConfirm', 'Type the new password again', 'new-password'),
    el('p', { class: 'note', text: 'After the change, everyone logged in to this admin page (on any device) is signed out and must log in with the new password.' }),
    err, btn);
    return form;
  }

  // ---------- start ----------
  if (token) showApp(); else showLogin();
})();
