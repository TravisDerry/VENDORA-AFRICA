// Help & support: contact buttons, FAQ and a message form (saved for the Vendora team's admin page)
(() => {
  const { $, el, fill, api, localPhone, owner } = V;

  const FAQS = [
    ['How do I list my business?', 'Click “List your business”, fill in the short form and submit. It is free. Our team then calls you to confirm your business is real; once approved, customers can see it and your free month starts.'],
    ['Why can’t customers see my business yet?', 'New businesses are checked by our team before they go live, to keep customers safe. You’ll get a call on the number you registered with. Meanwhile you can add products, photos and opening hours in “Manage my business”.'],
    ['What is an owner key?', 'A private code that proves you own a business on Vendora. It is shown when you register. Paste it in “Manage my business” on this website, or in the app, to manage your business from any device.'],
    ['I lost my owner key. What do I do?', 'Send us a message below with the topic “Owner key / account”, your business name and the phone number you registered with. After we confirm it is you, we’ll give you a new key; the old one then stops working.'],
    ['How do customers pay me?', 'In “Manage my business”, open “MoMo payments” and add the Mobile Money number where you want to receive money. Customers then see Buy and Pay buttons, and payments go straight to your MoMo through Paystack.'],
    ['How much does a listing cost?', 'Registering is free and your first month (after approval) is free. Then a small monthly fee depending on your business type — see Pricing. You pay with MoMo; nothing is charged automatically.'],
    ['I paid a business but have a problem with my order.', 'Payments go directly to the business, so contact them first by phone or WhatsApp. If they don’t help or you think it is fraud, send us a message with the topic “Report a business” and your payment reference.'],
    ['What does the Verified ✓ badge mean?', 'Our team has checked that the business is real, usually by calling the owner or visiting. Every business customers can see on Vendora has been checked this way.'],
  ];
  fill($('#faq'), FAQS.map(([q, a]) => el('details', {}, el('summary', { text: q }), el('p', { text: a }))));

  api('/support/info').then((s) => {
    const btns = [
      s.whatsapp ? el('a', { class: 'btn btn-wa', href: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Hello Vendora Africa, I need help with ')}`, target: '_blank', rel: 'noopener', text: '💬 WhatsApp us' }) : null,
      ...(s.phones || []).map((p) => el('a', { class: 'btn btn-light btn-phone', href: `tel:${p}`, text: `📞 ${localPhone(p)}` })),
      s.email ? el('a', { class: 'btn btn-ghost', href: `mailto:${s.email}?subject=${encodeURIComponent('Vendora Africa help')}`, text: `✉️ ${s.email}` }) : null,
    ];
    fill($('#contactButtons'), btns);
    if (s.hours) $('#heroText').textContent = `Our team is available ${s.hours}. Find answers below, contact us directly, or send a message.`;
  }).catch(() => {});

  const TOPICS = [['account', 'Owner key / account'], ['payments', 'Payments'], ['listing', 'My listing'], ['orders', 'An order'], ['report', 'Report a business'], ['other', 'Something else']];
  const myBusiness = owner.list()[0]?.name || '';

  function showForm() {
    const topic = el('select', { class: 'input', name: 'topic' }, TOPICS.map(([v, l]) => el('option', { value: v, text: l })));
    topic.value = 'other';
    const inputs = {
      name: el('input', { class: 'input', autocomplete: 'name', placeholder: 'e.g. Ama Mensah' }),
      phone: el('input', { class: 'input', type: 'tel', autocomplete: 'tel', placeholder: '024 123 4567' }),
      email: el('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' }),
      businessName: el('input', { class: 'input', placeholder: 'Optional', value: myBusiness }),
      message: el('textarea', { class: 'input', maxlength: '1500', placeholder: 'Tell us what happened or what you need' }),
    };
    const err = el('p', { class: 'error', role: 'alert' });
    const btn = el('button', { class: 'btn btn-primary btn-block btn-lg', type: 'submit', text: 'Send message' });
    fill($('#formCard'), el('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      const v = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value.trim()]));
      if (v.name.length < 2) { err.textContent = 'Enter your name.'; return; }
      if (!v.phone && !v.email) { err.textContent = 'Add a phone number or email so we can reply.'; return; }
      if (v.message.length < 10) { err.textContent = 'Please tell us a little more (at least 10 characters).'; return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const r = await api('/support/requests', { method: 'POST', body: JSON.stringify({ ...v, phone: v.phone || undefined, email: v.email || undefined, businessName: v.businessName || undefined, topic: topic.value }) });
        fill($('#formCard'), el('div', { class: 'center' },
          el('div', { style: { fontSize: '48px' }, text: '✅' }), el('h3', { text: 'Message sent' }),
          el('p', { class: 'muted', style: { marginTop: '6px' }, text: `We'll reply to ${v.phone || v.email}. Your reference is` }),
          el('div', { class: 'keybox', style: { marginTop: '10px' }, text: r.reference }),
          el('button', { class: 'btn btn-outline', style: { marginTop: '16px' }, text: 'Send another message', onclick: showForm })));
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Send message'; }
    } },
    el('label', { class: 'field' }, 'What is it about?', topic),
    el('label', { class: 'field' }, 'Your name', inputs.name),
    el('div', { class: 'form-row' }, el('label', { class: 'field' }, 'Phone number', inputs.phone), el('label', { class: 'field' }, 'Email (optional)', inputs.email)),
    el('label', { class: 'field' }, 'Business name (if you own one)', inputs.businessName),
    el('label', { class: 'field' }, 'Message', inputs.message),
    err, btn));
  }
  showForm();
})();
