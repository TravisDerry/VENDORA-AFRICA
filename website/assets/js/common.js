// Vendora Africa website — shared code for every page.
// Text from users (business names, descriptions…) is always inserted with textContent, never innerHTML.
/* eslint-disable no-unused-vars */
const V = (() => {
  document.documentElement.classList.add('js');
  // ---------- tiny DOM helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return node;
  };
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false));

  // ---------- API (same server as the website) ----------
  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(`/api${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    } catch (e) {
      throw new Error('Cannot reach Vendora right now. Check your internet connection and try again.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error || json.errors?.[0]?.msg || `Something went wrong (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  // ---------- formatting ----------
  const ghs = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
  const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
  const time12 = (t) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
    if (!m) return t || '';
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const phoneDigits = (p) => String(p || '').replace(/[^\d]/g, '').replace(/^0/, '233');
  const localPhone = (p) => String(p || '').replace(/^\+?233/, '0').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'V';
  const params = () => new URLSearchParams(location.search);

  // ---------- categories ----------
  const CATEGORIES = [
    { id: 'phones', name: 'Phones & electronics', short: 'Phones', icon: '📱', img: 'phones.jpg' },
    { id: 'cosmetics', name: 'Cosmetics & beauty', short: 'Beauty', icon: '💄', img: 'beauty.jpg' },
    { id: 'fashion', name: 'Fashion & clothing', short: 'Fashion', icon: '👗', img: 'african-print-fashion.jpg' },
    { id: 'food', name: 'Food & grocery', short: 'Food', icon: '🍲', img: 'food.jpg' },
    { id: 'hardware', name: 'Hardware & building', short: 'Hardware', icon: '🛠️', img: 'hardware.jpg' },
    { id: 'aluminum', name: 'Aluminium & glass', short: 'Aluminium', icon: '🪟', img: 'aluminium-glass.jpg' },
    { id: 'education', name: 'Education & training', short: 'Education', icon: '🎓', img: 'classroom.jpg' },
    { id: 'other', name: 'Other businesses', short: 'Other', icon: '🏪', img: 'small-shop.jpg' },
  ];
  const category = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  // ---------- business data ----------
  const photoUrl = (u) => (typeof u === 'string' && (/^https?:\/\//.test(u) || u.startsWith('/uploads/')) ? u : null);
  const coverOf = (b) => photoUrl(b?.images?.cover);
  const productPhoto = (p) => photoUrl(Array.isArray(p?.images) ? p.images[0] : null);
  const place = (b) => [titleCase(b?.location?.city || b?.location?.address), titleCase(b?.country)].filter(Boolean).join(', ');

  // Photo or plain branded cover with initials (never someone else's picture)
  const cover = (b, cls = 'cover') => {
    const url = coverOf(b);
    const node = el('div', { class: cls });
    if (url) {
      const img = el('img', { src: url, alt: '', loading: 'lazy' });
      img.addEventListener('error', () => { img.remove(); node.prepend(el('div', { class: 'initials', text: initials(b.businessName) })); });
      node.append(img);
    } else node.append(el('div', { class: 'initials', text: initials(b.businessName) }));
    return node;
  };

  const businessCard = (b) => el('a', { class: 'card biz-card', href: `/business.html?id=${encodeURIComponent(b._id)}` },
    (() => { const c = cover(b); c.append(el('span', { class: 'cat-pill', text: category(b.category).short })); return c; })(),
    el('div', { class: 'biz-body' },
      el('div', { class: 'biz-name' }, el('span', { text: b.businessName }), b.verified ? el('span', { class: 'tick', title: 'Verified by Vendora', text: '✓' }) : null),
      el('div', { class: 'biz-meta', text: `${category(b.category).name}${place(b) ? ` · ${place(b)}` : ''}` }),
      el('div', { class: 'biz-foot' },
        (b.products || []).length ? el('span', { class: 'tag blue', text: `${b.products.length} product${b.products.length === 1 ? '' : 's'}` }) : null,
        b.acceptsPayments ? el('span', { class: 'tag green', text: 'Pay with MoMo' }) : null)));

  // ---------- owner keys (this browser only) ----------
  const OWNED = 'vendora_owned_businesses';
  const owner = {
    list() { try { const l = JSON.parse(localStorage.getItem(OWNED) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } },
    key(id) { try { return localStorage.getItem(`vendora_owner_key_${id}`); } catch (e) { return null; } },
    save(id, key, name) {
      try {
        localStorage.setItem(`vendora_owner_key_${id}`, key);
        localStorage.setItem(OWNED, JSON.stringify([{ id: String(id), name }, ...owner.list().filter((b) => b.id !== String(id))]));
      } catch (e) { /* private browsing */ }
    },
    remove(id) {
      try {
        localStorage.removeItem(`vendora_owner_key_${id}`);
        localStorage.setItem(OWNED, JSON.stringify(owner.list().filter((b) => b.id !== String(id))));
      } catch (e) { /* ignore */ }
    },
  };

  // ---------- photos: resize to a JPG (max 1600px) and return base64 for upload ----------
  const fileToJpegBase64 = (file, maxWidth = 1600) => new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose a photo (JPG or PNG).'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo's format isn't supported here. Choose a JPG or PNG photo.")); };
    img.src = url;
  });

  // ---------- toast & modal ----------
  const toast = (msg) => {
    let t = $('#toast');
    if (!t) { t = el('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 3000);
  };
  const modal = (title, ...content) => {
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); if (wrap._onClose) wrap._onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const body = el('div', {}, content);
    const wrap = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: (e) => { if (e.target === wrap) close(); } },
      el('div', { class: 'modal-card' },
        el('div', { class: 'modal-head' }, el('h3', { text: title }), el('button', { class: 'modal-close', 'aria-label': 'Close', text: '✕', onclick: close })),
        body));
    document.body.append(wrap);
    document.addEventListener('keydown', onKey);
    return { body, close, set onClose(fn) { wrap._onClose = fn; } };
  };

  // ---------- MoMo payment (customers paying businesses, owners paying their listing) ----------
  const NETWORKS = { mtn: ['MTN', '#FFCC00', '#1A1A1A'], telecel: ['Telecel', '#E30613', '#fff'], airteltigo: ['AT', '#0A3D91', '#fff'] };
  let paymentConfig = null;
  const getPaymentConfig = async () => (paymentConfig = paymentConfig || await api('/payments/config'));

  // opts: { title, summary (node), amountText, start(form) -> payment, successText(payment) }
  async function momoPayment(opts) {
    const m = modal(opts.title, el('div', { class: 'loading', text: 'Loading…' }));
    let config;
    try { config = await getPaymentConfig(); } catch (e) { fill(m.body, el('p', { class: 'error', text: e.message })); return; }
    if (!config.enabled) { fill(m.body, el('div', { class: 'notice amber' }, el('div', {}, el('b', { text: 'Payments are not switched on yet' }), 'Please contact the business directly for now.'))); return; }

    let provider = 'mtn';
    let timer = null;
    m.onClose = () => clearTimeout(timer);

    const form = () => {
      const phone = el('input', { class: 'input', type: 'tel', placeholder: '024 123 4567', autocomplete: 'tel' });
      const err = el('p', { class: 'error' });
      const nets = el('div', { class: 'networks' }, config.providers.map((p) => {
        const [short, bg, fg] = NETWORKS[p.id] || [p.name, '#eee', '#000'];
        return el('button', { type: 'button', class: `network${p.id === provider ? ' on' : ''}`, onclick: (e) => { provider = p.id; nets.querySelectorAll('.network').forEach((n) => n.classList.toggle('on', n === e.currentTarget)); } },
          el('i', { style: { background: bg, color: fg }, text: short }), p.name);
      }));
      const extra = opts.fields ? opts.fields() : null;
      const pay = el('button', { class: 'btn btn-primary btn-block btn-lg', type: 'submit', text: `Pay ${opts.amountText()}` });
      if (extra && extra.onChange) extra.onChange(() => { pay.textContent = `Pay ${opts.amountText()}`; });
      const f = el('form', { class: 'form', onsubmit: async (e) => {
        e.preventDefault(); err.textContent = '';
        const digits = phone.value.replace(/\D/g, '');
        if (!((digits.length === 10 && digits.startsWith('0')) || (digits.length === 12 && digits.startsWith('233')))) { err.textContent = 'Enter your Mobile Money number, e.g. 024 123 4567'; return; }
        const extraErr = extra && extra.validate ? extra.validate() : '';
        if (extraErr) { err.textContent = extraErr; return; }
        pay.disabled = true; pay.textContent = 'Starting payment…';
        try { const r = await opts.start({ provider, phone: phone.value, extra: extra ? extra.values() : {} }); step(r.payment, phone.value); } catch (ex) { err.textContent = ex.message; pay.disabled = false; pay.textContent = `Pay ${opts.amountText()}`; }
      } },
      config.testMode ? el('div', { class: 'notice amber small' }, 'Test mode: no real money will be taken. Test MTN number: 055 123 4987') : null,
      opts.summary || null,
      extra ? extra.node : null,
      el('label', { class: 'field' }, 'Mobile Money network', nets),
      el('label', { class: 'field' }, 'Mobile Money number', phone),
      err, pay,
      el('p', { class: 'small muted center', text: 'Secured by Paystack. You approve the payment with your own MoMo PIN.' }));
      fill(m.body, f);
      phone.focus();
    };

    const poll = (ref, phone, started = Date.now()) => {
      timer = setTimeout(async () => {
        try { const r = await api(`/payments/${encodeURIComponent(ref)}`); if (r.payment.step !== 'approve') return step(r.payment, phone); } catch (e) { /* keep waiting */ }
        if (Date.now() - started > 180000) return step({ step: 'timeout', reference: ref }, phone);
        poll(ref, phone, started);
      }, 4000);
    };

    const step = (p, phone) => {
      clearTimeout(timer);
      if (p.step === 'success') {
        fill(m.body, el('div', { class: 'center' },
          el('div', { style: { fontSize: '54px' }, text: '✅' }),
          el('h3', { text: 'Payment successful' }),
          el('p', { class: 'muted', style: { marginTop: '8px' }, text: opts.successText(p) }),
          el('p', { class: 'small muted', style: { marginTop: '8px' }, text: `Reference: ${p.reference}${p.testMode ? ' · Test payment' : ''}` }),
          el('button', { class: 'btn btn-primary btn-block', style: { marginTop: '18px' }, text: 'Done', onclick: () => { m.close(); if (opts.onDone) opts.onDone(p); } })));
      } else if (p.step === 'failed' || p.step === 'timeout') {
        fill(m.body, el('div', { class: 'center' },
          el('div', { style: { fontSize: '54px' }, text: p.step === 'failed' ? '❌' : '⏳' }),
          el('h3', { text: p.step === 'failed' ? 'Payment not completed' : 'Still waiting for approval' }),
          el('p', { class: 'muted', style: { marginTop: '8px' }, text: p.step === 'failed' ? (p.message || 'The payment was declined or cancelled. No money was taken.') : 'If you approved it on your phone, check again.' }),
          p.step === 'timeout' ? el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '14px' }, text: 'Check again', onclick: async () => { try { const r = await api(`/payments/${encodeURIComponent(p.reference)}`); step(r.payment.step === 'approve' ? { ...r.payment, step: 'timeout' } : r.payment, phone); } catch (e) { toast(e.message); } } }) : null,
          el('button', { class: 'btn btn-primary btn-block', style: { marginTop: '10px' }, text: 'Try again', onclick: form })));
      } else if (p.step === 'otp') {
        const code = el('input', { class: 'input', inputmode: 'numeric', maxlength: '8', placeholder: '123456' });
        const err = el('p', { class: 'error' });
        fill(m.body, el('form', { class: 'form', onsubmit: async (e) => {
          e.preventDefault(); err.textContent = '';
          try { const r = await api(`/payments/${encodeURIComponent(p.reference)}/otp`, { method: 'POST', body: JSON.stringify({ otp: code.value.trim() }) }); step(r.payment, phone); } catch (ex) { err.textContent = ex.message; }
        } }, el('p', { text: p.message || 'Enter the code sent to your phone by SMS.' }), el('label', { class: 'field' }, 'Code', code), err, el('button', { class: 'btn btn-primary btn-block', type: 'submit', text: 'Confirm code' })));
        code.focus();
      } else {
        fill(m.body, el('div', { class: 'center' },
          el('div', { style: { fontSize: '54px' }, text: '📱' }),
          el('h3', { text: 'Check your phone' }),
          el('p', { class: 'muted', style: { marginTop: '8px' }, text: `A prompt for ${ghs(p.amount)} has been sent to ${phone}. Enter your Mobile Money PIN to approve.` }),
          el('div', { class: 'spinner', 'aria-label': 'Waiting' }),
          el('p', { class: 'small muted', text: 'No prompt? On MTN dial *170# and check My Approvals. Keep this window open.' })));
        poll(p.reference, phone);
      }
    };
    form();
  }

  // ---------- header & footer ----------
  const NAV = [['/', 'Home'], ['/browse.html', 'Browse'], ['/how-it-works.html', 'How it works'], ['/pricing.html', 'Pricing'], ['/help.html', 'Help'], ['/manage.html', 'For owners']];
  function header() {
    const here = location.pathname.replace(/\/$/, '/') || '/';
    const h = el('header', { class: 'site-header' },
      el('div', { class: 'wrap' },
        el('a', { class: 'brand', href: '/' }, el('img', { src: '/assets/img/logo-mark.png', alt: '' }), el('span', {}, 'VENDORA ', el('b', { text: 'AFRICA' }))),
        el('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map(([href, label]) => el('a', { href, class: here === href || (href !== '/' && here.startsWith(href.replace('.html', ''))) ? 'on' : null, text: label }))),
        el('div', { class: 'header-cta' }, el('a', { class: 'btn btn-primary', href: '/register.html', text: 'List your business' })),
        el('button', { class: 'menu-btn', 'aria-label': 'Menu', text: '☰', onclick: () => h.classList.toggle('open') })));
    document.body.prepend(h);
  }
  async function footer() {
    const contact = el('div', {}, el('h4', { text: 'Contact us' }), el('p', { class: 'small', text: 'Loading…' }));
    const f = el('footer', { class: 'site-footer' },
      el('div', { class: 'wrap' },
        el('div', { class: 'footer-grid' },
          el('div', {},
            el('a', { class: 'brand', href: '/' }, el('img', { src: '/assets/img/logo-mark.png', alt: '' }), el('span', {}, 'VENDORA ', el('b', { text: 'AFRICA' }))),
            el('p', { class: 'small', text: 'Find local businesses, see what they sell, and pay them with Mobile Money. Every business is checked by our team before it goes live.' })),
          el('div', {}, el('h4', { text: 'Customers' }), el('a', { href: '/browse.html', text: 'Browse businesses' }), el('a', { href: '/how-it-works.html', text: 'How it works' }), el('a', { href: '/help.html', text: 'Help & support' })),
          el('div', {}, el('h4', { text: 'Businesses' }), el('a', { href: '/register.html', text: 'List your business' }), el('a', { href: '/pricing.html', text: 'Pricing' }), el('a', { href: '/manage.html', text: 'Manage my business' })),
          contact),
        el('div', { class: 'footer-bottom' },
          el('span', { text: `© ${new Date().getFullYear()} Vendora Africa. Built for Africa, by Africa.` }),
          el('span', {}, el('a', { href: '/legal.html', style: { display: 'inline' }, text: 'Terms of Use' }), ' · ', el('a', { href: '/legal.html#privacy', style: { display: 'inline' }, text: 'Privacy Policy' })))));
    document.body.append(f);
    try {
      const s = await api('/support/info');
      fill(contact, el('h4', { text: 'Contact us' }),
        (s.phones || []).map((p) => el('a', { href: `tel:${p}`, text: `📞 ${localPhone(p)}` })),
        s.whatsapp ? el('a', { href: `https://wa.me/${s.whatsapp}`, target: '_blank', rel: 'noopener', text: '💬 WhatsApp' }) : null,
        s.email ? el('a', { href: `mailto:${s.email}`, text: `✉️ ${s.email}` }) : null,
        s.hours ? el('p', { class: 'small', text: `Open ${s.hours}` }) : null);
    } catch (e) {
      fill(contact, el('h4', { text: 'Contact us' }), el('a', { href: '/help.html', text: 'Help & support' }));
    }
  }

  // Gentle fade-in as sections scroll into view (skipped for people who prefer reduced motion)
  let observer = null;
  function reveal() {
    const items = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { items.forEach((n) => n.classList.add('in')); return; }
    observer = observer || new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); observer.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach((n) => observer.observe(n));
  }

  // Welcome screen: the logo with a welcome message, once per visit (tap to skip)
  function welcome() {
    let seen = false;
    try { seen = sessionStorage.getItem('vendora_welcome') === '1'; sessionStorage.setItem('vendora_welcome', '1'); } catch (e) { seen = true; }
    if (seen || !document.body || /^\/(admin|manage)/.test(location.pathname)) return;
    const quick = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const splash = el('div', { class: 'splash', role: 'dialog', 'aria-label': 'Welcome to Vendora Africa' },
      el('div', { class: 'splash-inner' },
        el('img', { class: 'splash-logo', src: '/assets/img/logo-mark.png', alt: 'Vendora Africa logo' }),
        el('p', { class: 'splash-hello', text: 'Welcome to' }),
        el('p', { class: 'splash-name' }, 'VENDORA ', el('span', { text: 'AFRICA' })),
        el('p', { class: 'splash-tag', text: 'Find trusted local businesses and pay with MoMo.' }),
        el('div', { class: 'splash-bar', 'aria-hidden': 'true' }, el('i'))));
    document.documentElement.classList.add('splash-on');
    document.body.append(splash);
    let gone = false;
    const close = () => {
      if (gone) return; gone = true;
      splash.classList.add('out');
      document.documentElement.classList.remove('splash-on');
      setTimeout(() => splash.remove(), 450);
    };
    splash.addEventListener('click', close);
    document.addEventListener('keydown', close, { once: true });
    setTimeout(close, quick ? 900 : 2200);
  }
  welcome();

  document.addEventListener('DOMContentLoaded', () => { header(); footer(); reveal(); });

  return { reveal, $, el, fill, api, ghs, titleCase, time12, when, day, phoneDigits, localPhone, initials, params, CATEGORIES, category, photoUrl, coverOf, productPhoto, place, cover, businessCard, owner, fileToJpegBase64, toast, modal, momoPayment, getPaymentConfig };
})();
