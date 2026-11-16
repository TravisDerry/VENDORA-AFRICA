// Register a business, then show the owner key and the "waiting for approval" next steps
(() => {
  const { $, el, fill, api, ghs, CATEGORIES, owner, toast } = V;
  const form = $('#regForm');
  const select = $('#categorySelect');
  CATEGORIES.forEach((c) => select.append(el('option', { value: c.id, text: c.name })));

  let prices = {};
  V.getPaymentConfig().then((c) => { (c.pricing?.categories || []).forEach((p) => { prices[p.id] = p.price; }); }).catch(() => {});
  select.addEventListener('change', () => {
    const p = prices[select.value];
    $('#priceHint').textContent = p ? `After your free month: ${ghs(p)} per month.` : 'Your monthly price depends on your category.';
  });

  // 024 123 4567 -> +233241234567 (Ghana); other numbers must include the country code
  const toInternational = (v, country) => {
    let d = String(v || '').replace(/[^\d+]/g, '');
    if (d.startsWith('00')) d = `+${d.slice(2)}`;
    if (!d.startsWith('+') && d.startsWith('0') && country === 'ghana') d = `+233${d.slice(1)}`;
    if (!d.startsWith('+') && /^233/.test(d)) d = `+${d}`;
    return d;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#regError');
    err.textContent = '';
    const f = Object.fromEntries(new FormData(form).entries());
    const phone = toInternational(f.phoneNumber, f.country);
    const problems = [];
    if ((f.firstName || '').trim().length < 2) problems.push('first name');
    if ((f.lastName || '').trim().length < 2) problems.push('last name');
    if (!/^\+?[1-9]\d{8,15}$/.test(phone)) problems.push('a valid phone number (e.g. 024 123 4567)');
    if (!/^\S+@\S+\.\S+$/.test(f.email || '')) problems.push('a valid email');
    if ((f.businessName || '').trim().length < 2) problems.push('business name');
    if (!f.businessCategory) problems.push('category');
    if (problems.length) { err.textContent = `Please add: ${problems.join(', ')}.`; return; }
    if (!form.terms.checked) { err.textContent = 'Please accept the Terms of Use to continue.'; return; }

    const btn = $('#regBtn');
    btn.disabled = true; btn.textContent = 'Creating your listing…';
    try {
      const r = await api('/businesses', { method: 'POST', body: JSON.stringify({
        firstName: f.firstName.trim(), lastName: f.lastName.trim(), businessName: f.businessName.trim(), phoneNumber: phone,
        email: f.email.trim(), businessCategory: f.businessCategory, country: f.country, city: (f.city || '').trim(),
        address: (f.address || '').trim(), businessDescription: (f.businessDescription || '').trim(),
      }) });
      owner.save(r.business.id, r.manageKey, r.business.businessName);
      success(r, f);
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false; btn.textContent = 'Create my free listing';
    }
  });

  function success(r, f) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const key = r.manageKey;
    fill($('#formCard'),
      el('div', { style: { fontSize: '48px' }, text: '🎉' }),
      el('h2', { text: `Welcome, ${f.firstName}!` }),
      el('p', { class: 'muted', style: { marginTop: '6px' }, text: r.approvalRequired !== false
        ? `${r.business.businessName} has been sent to Vendora Africa for approval.`
        : `${r.business.businessName} is now live on Vendora Africa.` }),
      r.approvalRequired !== false ? el('div', { class: 'notice amber', style: { marginTop: '18px' } },
        el('div', {}, el('b', { text: 'Waiting for approval' }), `Our team will call you on ${f.phoneNumber} to confirm your business is real. Customers can see it once it's approved, and your free month starts then.`)) : null,
      el('h3', { style: { marginTop: '22px' }, text: '🔑 Your owner key' }),
      el('p', { class: 'small muted', style: { margin: '6px 0 10px' }, text: 'This browser has saved it. Keep a copy: you need it to manage your business on another phone or computer. Anyone with this key can change your products and where your payments go, so keep it private.' }),
      el('div', { class: 'keybox', text: key }),
      el('div', { class: 'hero-actions', style: { marginTop: '12px' } },
        el('button', { class: 'btn btn-outline', text: 'Copy key', onclick: async () => { try { await navigator.clipboard.writeText(key); toast('Owner key copied'); } catch (e) { toast('Select the key and copy it'); } } }),
        el('a', { class: 'btn btn-wa', target: '_blank', rel: 'noopener', href: `https://wa.me/?text=${encodeURIComponent(`My Vendora Africa owner key for ${r.business.businessName}: ${key}`)}`, text: 'Save to WhatsApp' })),
      el('div', { class: 'hero-actions', style: { marginTop: '24px' } },
        el('a', { class: 'btn btn-primary btn-lg', href: `/manage.html?id=${encodeURIComponent(r.business.id)}`, text: 'Add products & photos' }),
        el('a', { class: 'btn btn-outline btn-lg', href: '/', text: 'Back to home' })));
  }
})();
