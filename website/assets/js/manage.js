// Owner tools on the website. The owner key (saved in this browser) is sent as X-Manage-Key on every change.
(() => {
  const { $, el, fill, api, ghs, day, when, time12, category, place, coverOf, productPhoto, initials, localPhone, owner, fileToJpegBase64, toast, momoPayment } = V;
  const app = $('#app');
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let biz = null;
  let key = null;
  let section = 'overview';

  const auth = (extra = {}) => ({ headers: { 'X-Manage-Key': key, ...extra } });
  const call = (path, opts = {}) => api(path, { ...opts, headers: { 'X-Manage-Key': key, ...(opts.headers || {}) } });

  // ---------- sign in with owner key ----------
  function signIn(message) {
    $('#title').textContent = 'Manage my business';
    const input = el('input', { class: 'input', placeholder: 'Paste your owner key', autocomplete: 'off', spellcheck: 'false' });
    const err = el('p', { class: 'error', role: 'alert', text: message || '' });
    const btn = el('button', { class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: 'Open my business' });
    const saved = owner.list();
    fill(app, el('div', saved.length
      ? { class: 'grid grid-2', style: { alignItems: 'start' } }
      : { style: { maxWidth: '560px', margin: '0 auto' } },
      el('div', { class: 'card card-pad' },
        el('h2', { style: { fontSize: '24px' }, text: 'Sign in with your owner key' }),
        el('p', { class: 'muted', style: { margin: '6px 0 16px' }, text: 'Your owner key was shown when you registered your business (on this website or in the app).' }),
        el('form', { class: 'form', onsubmit: async (e) => {
          e.preventDefault(); err.textContent = '';
          const k = input.value.trim();
          if (k.length < 10) { err.textContent = 'Paste the full owner key.'; return; }
          btn.disabled = true; btn.textContent = 'Checking…';
          try {
            const b = await api('/businesses/mine', { headers: { 'X-Manage-Key': k } });
            owner.save(b._id, k, b.businessName);
            history.replaceState(null, '', `/manage.html?id=${encodeURIComponent(b._id)}`);
            open(b._id);
          } catch (ex) { err.textContent = ex.status === 403 ? 'That owner key does not match any business. Check it and try again.' : ex.message; btn.disabled = false; btn.textContent = 'Open my business'; }
        } }, el('label', { class: 'field' }, 'Owner key', input), err, btn),
        el('p', { class: 'small muted', style: { marginTop: '14px' } }, 'Lost your key? ', el('a', { href: '/help.html#message', text: 'Contact us' }), ' and we’ll help after confirming it’s you.')),
      saved.length ? el('div', { class: 'card card-pad' },
        el('h3', { text: 'Businesses on this browser' }),
        saved.map((s) => el('div', { class: 'detail-row' }, el('b', { text: s.name }), el('button', { class: 'btn btn-outline btn-sm', text: 'Open', onclick: () => open(s.id) })))) : null));
    input.focus();
  }

  // ---------- load a business ----------
  async function open(id) {
    key = owner.key(id);
    if (!key) return signIn();
    fill(app, el('div', { class: 'loading', text: 'Loading your business…' }));
    try {
      biz = await api('/businesses/mine', auth());
      if (String(biz._id) !== String(id)) { owner.save(biz._id, key, biz.businessName); }
      render();
    } catch (e) {
      if (e.status === 403 || e.status === 401) { owner.remove(id); return signIn('This browser’s owner key no longer works (a new key may have been issued). Paste your current key.'); }
      fill(app, el('div', { class: 'card empty' }, el('b', { text: 'Could not load your business' }), el('p', { text: e.message }), el('button', { class: 'btn btn-primary', style: { marginTop: '14px' }, text: 'Try again', onclick: () => open(id) })));
    }
  }
  const reload = async () => { biz = await api('/businesses/mine', auth()); render(); };

  // ---------- layout ----------
  const SECTIONS = [['overview', 'Overview'], ['products', 'Products'], ['photo', 'Cover photo'], ['details', 'Details & hours'], ['momo', 'MoMo payments'], ['key', 'Owner key']];
  function render() {
    $('#title').textContent = biz.businessName;
    $('#subtitle').textContent = `${category(biz.category).name}${place(biz) ? ` · ${place(biz)}` : ''} · ${biz.verified ? '✓ Approved and live' : '⏳ Waiting for approval'}`;
    const panel = el('div', { class: 'owner-panel' });
    const nav = el('nav', { class: 'card owner-nav', 'aria-label': 'Owner tools' }, SECTIONS.map(([id, label]) => el('button', { class: id === section ? 'on' : null, text: label, onclick: () => { section = id; render(); } })),
      el('a', { class: 'btn btn-outline btn-sm', style: { marginTop: '8px' }, href: `/business.html?id=${encodeURIComponent(biz._id)}`, text: 'View public page' }),
      el('button', { class: 'btn btn-sm', style: { marginTop: '4px', color: 'var(--muted)', background: 'transparent' }, text: 'Sign out of this browser', onclick: () => { if (confirm('Remove this business from this browser? You can sign in again with your owner key.')) { owner.remove(biz._id); biz = null; section = 'overview'; history.replaceState(null, '', '/manage.html'); signIn(); } } }));
    fill(app, el('div', { class: 'owner-shell' }, nav, panel));
    ({ overview, products, photo, details, momo, key: keyPanel })[section](panel);
  }

  // ---------- overview ----------
  async function overview(panel) {
    const l = biz.listing || {};
    const statusCard = !biz.verified
      ? el('div', { class: 'notice amber' }, el('div', {}, el('b', { text: 'Waiting for approval' }), `Customers can’t see your business yet. Our team will call you on ${localPhone(biz.phoneNumber)} to confirm it’s real. Meanwhile, add products, photos and opening hours. Your free month starts on the day you’re approved.`))
      : listingCard(l);
    const checklist = [
      [!!coverOf(biz), 'Add a cover photo', 'photo'],
      [(biz.products || []).length > 0, 'Add your products', 'products'],
      [!!biz.description, 'Write a description', 'details'],
      [!!(biz.businessHours && DAYS.some((d) => biz.businessHours[d]?.open || biz.businessHours[d]?.closed)), 'Set opening hours', 'details'],
      [!!biz.acceptsPayments, 'Turn on MoMo payments', 'momo'],
    ];
    const done = checklist.filter((c) => c[0]).length;
    const stats = el('div', { class: 'grid grid-3' },
      el('div', { class: 'card card-pad' }, el('div', { class: 'muted small', text: 'Products' }), el('div', { style: { fontSize: '30px', fontWeight: '800', color: 'var(--navy)' }, text: String((biz.products || []).length) })),
      el('div', { class: 'card card-pad' }, el('div', { class: 'muted small', text: 'Page views' }), el('div', { style: { fontSize: '30px', fontWeight: '800', color: 'var(--navy)' }, text: String(biz.views || 0) })),
      el('div', { class: 'card card-pad', id: 'paidStat' }, el('div', { class: 'muted small', text: 'Payments received' }), el('div', { style: { fontSize: '30px', fontWeight: '800', color: 'var(--green)' }, text: '…' })));
    fill(panel, statusCard, stats,
      el('div', { class: 'card card-pad' },
        el('div', { class: 'panel-title' }, el('h3', { text: 'Get your page ready' }), el('span', { class: `tag ${done === checklist.length ? 'green' : 'blue'}`, text: `${done} of ${checklist.length} done` })),
        checklist.map(([ok, label, target]) => el('div', { class: 'detail-row' }, el('span', { text: `${ok ? '✅' : '⬜'} ${label}` }), ok ? el('span', { class: 'muted small', text: 'Done' }) : el('button', { class: 'btn btn-outline btn-sm', text: 'Do it', onclick: () => { section = target; render(); } })))));
    try {
      const { payments } = await call(`/payments/received/${biz._id}`);
      const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const s = $('#paidStat'); if (s) s.lastChild.textContent = payments.length ? ghs(total) : '0';
    } catch (e) { const s = $('#paidStat'); if (s) s.lastChild.textContent = '–'; }
  }

  function listingCard(l) {
    if (!l || !l.endsAt) return el('div', { class: 'notice green' }, el('div', {}, el('b', { text: 'Your business is live' }), 'Customers can find you on Vendora Africa.'));
    const map = {
      trial: ['blue', `Free month: ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'} left`, `Free until ${day(l.endsAt)}. After that ${ghs(l.monthlyPrice)}/month. Pay early and your paid month starts when the free one ends.`],
      active: ['green', `Listing paid: ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'} left`, `Paid until ${day(l.endsAt)}. ${ghs(l.monthlyPrice)}/month. Paying now adds another month.`],
      grace: ['amber', `Payment due: hidden in ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'}`, `Your month ended on ${day(l.endsAt)}. Pay ${ghs(l.monthlyPrice)} before ${day(l.graceEndsAt)} or customers will stop seeing your business.`],
      expired: ['red', 'Hidden from customers', `Pay ${ghs(l.monthlyPrice)} to show your business again straight away.`],
    };
    const [tone, title, text] = map[l.status] || map.active;
    return el('div', { class: `notice ${tone}` }, el('div', { style: { flex: '1' } }, el('b', { text: title }), text),
      el('button', { class: 'btn btn-primary btn-sm', text: `Pay ${ghs(l.monthlyPrice)}`, onclick: payListing }));
  }

  function payListing() {
    const l = biz.listing || {};
    momoPayment({
      title: 'Pay your monthly listing',
      summary: el('div', { class: 'card card-pad', style: { boxShadow: 'none' } }, el('b', { text: biz.businessName }), el('div', { class: 'small muted', text: `Monthly listing · 30 days · ${category(biz.category).name}` }), el('div', { style: { fontSize: '26px', fontWeight: '800', color: 'var(--navy)', marginTop: '4px' }, text: ghs(l.monthlyPrice) })),
      amountText: () => ghs(l.monthlyPrice),
      start: ({ provider, phone }) => call('/payments/plan', { method: 'POST', body: JSON.stringify({ businessId: biz._id, provider, phone }) }),
      successText: () => 'One month has been added to your listing.',
      onDone: () => reload(),
    });
  }

  // ---------- products ----------
  function products(panel) {
    const list = biz.products || [];
    const form = productForm();
    fill(panel,
      el('div', { class: 'card card-pad' },
        el('div', { class: 'panel-title' }, el('h3', { text: `Your products (${list.length})` })),
        list.length ? el('div', { style: { display: 'grid', gap: '10px' } }, list.map((p) => {
          const photo = productPhoto(p);
          return el('div', { class: 'card product', style: { boxShadow: 'none' } },
            el('div', { class: 'product-img' }, photo ? el('img', { src: photo, alt: '' }) : category(biz.category).icon),
            el('div', { class: 'product-info' }, el('b', { text: p.name }), el('div', { class: 'price', text: typeof p.price === 'number' && p.price > 0 ? ghs(p.price) : 'Price on request' }), p.inStock === false ? el('span', { class: 'tag red', text: 'Out of stock' }) : null),
            el('button', { class: 'btn btn-danger btn-sm', text: 'Remove', onclick: async () => {
              if (!confirm(`Remove ${p.name}? Customers will no longer see it.`)) return;
              try { await call(`/businesses/${biz._id}/products/${p._id}`, { method: 'DELETE' }); toast('Product removed'); await reload(); } catch (e) { toast(e.message); }
            } }));
        })) : el('p', { class: 'muted', text: 'No products yet. Add your first one below so customers know what you sell.' })),
      form);
  }

  function productForm() {
    const f = { name: el('input', { class: 'input', placeholder: 'e.g. Jollof rice tray' }), price: el('input', { class: 'input', inputmode: 'decimal', placeholder: 'e.g. 150' }), category: el('input', { class: 'input', placeholder: 'e.g. Meals' }), description: el('textarea', { class: 'input', maxlength: '500', placeholder: 'Size, colour, what’s included…' }) };
    const inStock = el('input', { type: 'checkbox', checked: true });
    let imageUrl = '';
    const photoBox = el('div');
    const fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const file = fileInput.files[0]; if (!file) return;
      fill(photoBox, el('div', { class: 'loading', text: 'Uploading photo…' }));
      try {
        const base64 = await fileToJpegBase64(file);
        const r = await call(`/businesses/${biz._id}/uploads`, { method: 'POST', body: JSON.stringify({ photo: base64 }) });
        imageUrl = r.url;
        fill(photoBox, el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, el('img', { src: r.url, alt: '', style: { width: '84px', height: '84px', objectFit: 'cover', borderRadius: '12px' } }), el('span', { class: 'tag green', text: 'Photo added' }), el('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Change', onclick: () => fileInput.click() })));
      } catch (e) { imageUrl = ''; drawPhotoPicker(); toast(e.message); }
    } });
    const drawPhotoPicker = () => fill(photoBox, el('div', { class: 'photo-drop', role: 'button', tabindex: '0', onclick: () => fileInput.click() }, '📷 Add a photo', el('span', { class: 'small muted', text: 'Optional, but products with photos sell better' })));
    drawPhotoPicker();
    const err = el('p', { class: 'error', role: 'alert' });
    const btn = el('button', { class: 'btn btn-primary btn-lg', type: 'submit', text: 'Add product' });
    return el('div', { class: 'card card-pad' },
      el('h3', { text: 'Add a product' }),
      el('form', { class: 'form', style: { marginTop: '12px' }, onsubmit: async (e) => {
        e.preventDefault(); err.textContent = '';
        const name = f.name.value.trim(); const price = f.price.value.replace(/,/g, '').trim();
        if (name.length < 2) { err.textContent = 'Enter a product name.'; return; }
        if (price && !(Number(price) >= 0)) { err.textContent = 'Enter the price in numbers, e.g. 150 or 12.50'; return; }
        btn.disabled = true; btn.textContent = 'Adding…';
        try {
          await call(`/businesses/${biz._id}/products`, { method: 'POST', body: JSON.stringify({ name, price: price || undefined, category: f.category.value.trim() || undefined, description: f.description.value.trim() || undefined, imageUrl: imageUrl || undefined, inStock: inStock.checked }) });
          toast(`${name} added`); await reload();
        } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Add product'; }
      } },
      el('div', { class: 'form-row' }, el('label', { class: 'field' }, 'Product name', f.name), el('label', { class: 'field' }, 'Price (GHS)', f.price, el('small', { text: 'Leave empty to show “Price on request”.' }))),
      el('label', { class: 'field' }, 'Category (optional)', f.category),
      el('label', { class: 'field' }, 'Description (optional)', f.description),
      el('div', { class: 'field' }, 'Photo', photoBox, fileInput),
      el('label', { class: 'check' }, inStock, el('span', { text: 'In stock (customers can buy it now)' })),
      err, btn));
  }

  // ---------- cover photo ----------
  function photo(panel) {
    const url = coverOf(biz);
    const fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const file = fileInput.files[0]; if (!file) return;
      status.textContent = 'Uploading photo…';
      try { const base64 = await fileToJpegBase64(file); await call(`/businesses/${biz._id}/photo`, { method: 'POST', body: JSON.stringify({ photo: base64 }) }); toast('Cover photo saved'); await reload(); } catch (e) { status.textContent = ''; toast(e.message); }
    } });
    const status = el('p', { class: 'muted small' });
    fill(panel, el('div', { class: 'card card-pad' },
      el('h3', { text: 'Cover photo' }),
      el('p', { class: 'muted small', style: { margin: '6px 0 14px' }, text: 'Show customers your shop, your food or your products. Without a photo, your page shows a plain cover with your initials.' }),
      url ? el('img', { class: 'cover-preview', src: url, alt: 'Your cover photo' }) : el('div', { class: 'cover-preview', style: { display: 'grid', placeItems: 'center', color: '#fff', fontSize: '40px', fontWeight: '800' }, text: initials(biz.businessName) }),
      el('div', { class: 'hero-actions', style: { marginTop: '14px' } },
        el('button', { class: 'btn btn-primary', text: url ? 'Change photo' : 'Upload a photo', onclick: () => fileInput.click() }),
        url ? el('button', { class: 'btn btn-danger', text: 'Remove photo', onclick: async () => { if (!confirm('Remove your cover photo?')) return; try { await call(`/businesses/${biz._id}/photo`, { method: 'DELETE' }); toast('Photo removed'); await reload(); } catch (e) { toast(e.message); } } }) : null),
      status, fileInput));
  }

  // ---------- details & hours ----------
  function details(panel) {
    const desc = el('textarea', { class: 'input', maxlength: '500', placeholder: 'Tell customers about your business: what you sell, delivery, special offers…' });
    desc.value = biz.description || '';
    const city = el('input', { class: 'input', value: biz.location?.city || '' });
    const address = el('input', { class: 'input', value: biz.location?.address || '', placeholder: 'e.g. Osu, near the market' });
    const err = el('p', { class: 'error' });
    const detailsForm = el('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try { await call(`/businesses/${biz._id}/details`, { method: 'PUT', body: JSON.stringify({ description: desc.value.trim(), city: city.value.trim(), address: address.value.trim() }) }); toast('Details saved'); await reload(); } catch (ex) { err.textContent = ex.message; }
    } },
    el('label', { class: 'field' }, 'Description', desc),
    el('div', { class: 'form-row' }, el('label', { class: 'field' }, 'Town / city', city), el('label', { class: 'field' }, 'Address or landmark', address)),
    el('p', { class: 'small muted' }, `Business name, phone (${localPhone(biz.phoneNumber)}) and email can be changed by our team — `, el('a', { href: '/help.html#message', text: 'contact us' }), '.'),
    err, el('button', { class: 'btn btn-primary', type: 'submit', text: 'Save details' }));

    const hours = {};
    const rows = DAYS.map((d) => {
      const h = biz.businessHours?.[d] || {};
      const isSet = DAYS.some((x) => biz.businessHours?.[x]?.open || biz.businessHours?.[x]?.closed);
      const open = el('input', { type: 'checkbox', checked: isSet ? !h.closed && !!h.open : d !== 'sunday' });
      const from = el('input', { type: 'time', value: h.open || '08:00' });
      const to = el('input', { type: 'time', value: h.close || '18:00' });
      const times = el('div', { class: 'times' }, from, el('span', { class: 'muted', text: 'to' }), to);
      const sync = () => { times.style.visibility = open.checked ? 'visible' : 'hidden'; };
      open.addEventListener('change', sync); sync();
      hours[d] = { open, from, to };
      return el('div', { class: 'hours-edit' }, el('b', { text: d[0].toUpperCase() + d.slice(1) }), el('label', { class: 'check', style: { alignItems: 'center' } }, open, el('span', { text: 'Open' })), times);
    });
    const hErr = el('p', { class: 'error' });
    const hoursForm = el('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault(); hErr.textContent = '';
      const body = {};
      DAYS.forEach((d) => { const h = hours[d]; body[d] = h.open.checked ? { closed: false, open: h.from.value, close: h.to.value } : { closed: true }; });
      try { await call(`/businesses/${biz._id}/hours`, { method: 'PUT', body: JSON.stringify({ hours: body }) }); toast('Opening hours saved'); await reload(); } catch (ex) { hErr.textContent = ex.message; }
    } }, el('div', {}, rows),
    el('button', { type: 'button', class: 'btn btn-outline btn-sm', style: { justifySelf: 'start' }, text: 'Copy Monday to Tuesday – Friday', onclick: () => { ['tuesday', 'wednesday', 'thursday', 'friday'].forEach((d) => { hours[d].open.checked = hours.monday.open.checked; hours[d].open.dispatchEvent(new Event('change')); hours[d].from.value = hours.monday.from.value; hours[d].to.value = hours.monday.to.value; }); } }),
    hErr, el('button', { class: 'btn btn-primary', type: 'submit', text: 'Save opening hours' }));

    fill(panel,
      el('div', { class: 'card card-pad' }, el('h3', { style: { marginBottom: '12px' }, text: 'Business details' }), detailsForm),
      el('div', { class: 'card card-pad' }, el('h3', { text: 'Opening hours' }), el('p', { class: 'muted small', style: { margin: '6px 0 10px' }, text: 'Customers see these on your page.' }), hoursForm));
  }

  // ---------- MoMo payouts & payments received ----------
  async function momo(panel) {
    fill(panel, el('div', { class: 'loading', text: 'Loading…' }));
    let payout;
    let received = [];
    try { payout = await call(`/payments/payout/${biz._id}`); } catch (e) { fill(panel, el('div', { class: 'card empty' }, el('b', { text: 'Could not load MoMo settings' }), el('p', { text: e.message }))); return; }
    try { received = (await call(`/payments/received/${biz._id}`)).payments || []; } catch (e) { /* show none */ }
    let config = null;
    try { config = await V.getPaymentConfig(); } catch (e) { /* ignore */ }
    const providers = config?.providers || [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'telecel', name: 'Telecel Cash' }, { id: 'airteltigo', name: 'AirtelTigo Money' }];

    const prov = el('select', { class: 'input' }, providers.map((p) => el('option', { value: p.id, text: p.name })));
    if (payout.provider) prov.value = payout.provider;
    const phone = el('input', { class: 'input', type: 'tel', placeholder: '024 123 4567' });
    const name = el('input', { class: 'input', value: payout.accountName || '', placeholder: 'Name registered on the MoMo account' });
    const err = el('p', { class: 'error' });
    const setupForm = el('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try { await call(`/payments/payout/${biz._id}`, { method: 'POST', body: JSON.stringify({ provider: prov.value, phone: phone.value, accountName: name.value.trim() }) }); toast('MoMo payments are on'); await reload(); section = 'momo'; render(); } catch (ex) { err.textContent = ex.message; }
    } },
    el('div', { class: 'form-row' }, el('label', { class: 'field' }, 'Network', prov), el('label', { class: 'field' }, 'MoMo number to receive money', phone)),
    el('label', { class: 'field' }, 'Name on the MoMo account', name),
    config?.testMode ? el('p', { class: 'small muted', text: 'Test mode: use 055 123 4987.' }) : null,
    err, el('button', { class: 'btn btn-primary', type: 'submit', text: payout.provider ? 'Save new number' : 'Save and accept payments' }));

    const total = received.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    fill(panel,
      el('div', { class: `notice ${payout.enabled ? 'green' : 'blue'}` }, el('div', { style: { flex: '1' } },
        el('b', { text: payout.enabled ? 'Accepting MoMo payments' : 'Not accepting payments yet' }),
        payout.enabled ? `Money is sent to ${payout.phone} (${payout.accountName}). Customers see Buy and Pay buttons on your page.` : 'Add the MoMo number where you want to receive money. Paystack sends each customer payment straight to it.'),
        payout.enabled ? el('button', { class: 'btn btn-danger btn-sm', text: 'Turn off', onclick: async () => { if (!confirm('Stop accepting payments? Customers will no longer see Buy and Pay buttons.')) return; try { await call(`/payments/payout/${biz._id}`, { method: 'DELETE' }); toast('MoMo payments turned off'); await reload(); section = 'momo'; render(); } catch (e) { toast(e.message); } } }) : null),
      el('div', { class: 'card card-pad' }, el('h3', { style: { marginBottom: '12px' }, text: payout.enabled ? 'Change where money is sent' : 'Where should we send your money?' }), setupForm,
        el('p', { class: 'small muted', style: { marginTop: '10px' }, text: `Paystack’s fee is taken from each payment${payout.commissionPercent ? ` plus a ${payout.commissionPercent}% Vendora fee` : ''}.` })),
      el('div', { class: 'card card-pad' },
        el('div', { class: 'panel-title' }, el('h3', { text: 'Payments received' }), received.length ? el('span', { class: 'tag green', text: ghs(total) }) : null),
        received.length ? el('div', { style: { overflowX: 'auto' } }, el('table', { class: 'table' },
          el('thead', {}, el('tr', {}, ['Date', 'Customer', 'For', 'Amount'].map((h) => el('th', { text: h })))),
          el('tbody', {}, received.map((p) => el('tr', {},
            el('td', { text: when(p.paidAt) }),
            el('td', {}, el('b', { text: p.customerName || 'Customer' }), el('div', { class: 'small muted', text: p.customerPhone })),
            el('td', {}, p.productName ? `${p.productName}${p.quantity > 1 ? ` × ${p.quantity}` : ''}` : 'Payment', p.note ? el('div', { class: 'small muted', text: `“${p.note}”` }) : null),
            el('td', {}, el('b', { text: ghs(p.amount) }), p.testMode ? el('div', {}, el('span', { class: 'tag amber', text: 'Test' })) : null))))))
          : el('p', { class: 'muted', text: 'No payments yet. When customers pay you, you’ll see their name, what they paid for and any note here.' })));
  }

  // ---------- owner key ----------
  function keyPanel(panel) {
    fill(panel, el('div', { class: 'card card-pad' },
      el('h3', { text: '🔑 Your owner key' }),
      el('p', { class: 'muted small', style: { margin: '6px 0 12px' }, text: 'Use it to manage your business on another phone or computer (here under “Manage my business”, or in the app under Account › Manage my business). Keep it private: anyone with it can change your products and where your payments go.' }),
      el('div', { class: 'keybox', text: key }),
      el('div', { class: 'hero-actions', style: { marginTop: '12px' } },
        el('button', { class: 'btn btn-outline', text: 'Copy key', onclick: async () => { try { await navigator.clipboard.writeText(key); toast('Owner key copied'); } catch (e) { toast('Select the key and copy it'); } } }))));
  }

  // ---------- start ----------
  const id = V.params().get('id') || owner.list()[0]?.id;
  if (id && owner.key(id)) open(id); else signIn();
})();
