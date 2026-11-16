// Public business page: details, products, opening hours, contact and MoMo payments
(() => {
  const { $, el, fill, api, ghs, time12, category, place, coverOf, productPhoto, initials, phoneDigits, localPhone, owner, momoPayment, params } = V;
  const id = params().get('id');
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const notFound = (msg) => fill($('#page'), el('section', { class: 'section' }, el('div', { class: 'wrap' },
    el('div', { class: 'card empty' }, el('b', { text: 'Business not available' }), el('p', { text: msg }),
      el('a', { class: 'btn btn-primary', style: { marginTop: '16px' }, href: '/browse.html', text: 'Browse businesses' })))));

  if (!id) return notFound('No business was chosen.');

  (async () => {
    const key = owner.key(id);
    let b;
    try {
      b = await api(`/businesses/${encodeURIComponent(id)}`, { headers: key ? { 'X-Manage-Key': key } : {} });
    } catch (e) {
      return notFound(e.status === 404 ? 'This business is not on Vendora Africa, or is waiting for approval.' : e.message);
    }
    let pay = { acceptsPayments: false };
    try { pay = await api(`/payments/business/${encodeURIComponent(id)}`); } catch (e) { /* contact only */ }
    document.title = `${b.businessName} — Vendora Africa`;
    render(b, pay, !!key);
  })();

  function render(b, pay, isOwner) {
    const cat = category(b.category);
    const phone = phoneDigits(b.phoneNumber);
    const coverUrl = coverOf(b);
    const products = Array.isArray(b.products) ? b.products : [];
    const canPay = pay.acceptsPayments === true;
    const waText = (msg) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.businessName, b.location?.address, b.location?.city, b.country].filter(Boolean).join(', '))}`;

    // hero
    const hero = el('section', { class: `biz-hero${coverUrl ? '' : ' plain'}` },
      el('div', { class: 'wrap' },
        el('div', { class: 'biz-logo' }, coverUrl ? el('img', { src: coverUrl, alt: '' }) : initials(b.businessName)),
        el('div', { style: { flex: '1', minWidth: '240px' } },
          el('h1', { text: b.businessName }),
          el('div', { class: 'sub' },
            el('span', { text: `${cat.icon} ${cat.name}` }),
            place(b) ? el('span', { text: `📍 ${place(b)}` }) : null,
            b.verified ? el('span', { text: '✓ Verified by Vendora' }) : el('span', { text: '⏳ Waiting for approval' })),
          el('div', { class: 'biz-actions' },
            phone ? el('a', { class: 'btn btn-light', href: `tel:+${phone}`, text: '📞 Call' }) : null,
            phone ? el('a', { class: 'btn btn-wa', href: waText(`Hello ${b.businessName}, I found you on Vendora Africa.`), target: '_blank', rel: 'noopener', text: '💬 WhatsApp' }) : null,
            el('a', { class: 'btn btn-ghost', href: mapsUrl, target: '_blank', rel: 'noopener', text: '🧭 Directions' }),
            canPay ? el('button', { class: 'btn btn-primary', text: '💳 Pay with MoMo', onclick: () => payBusiness(b, null) }) : null))));
    if (coverUrl) hero.style.backgroundImage = `url('${coverUrl.replace(/'/g, '%27')}')`;

    // owner bar
    const ownerBar = isOwner ? el('div', { class: 'notice blue', style: { marginBottom: '18px' } },
      el('div', { style: { flex: '1' } }, el('b', { text: 'You manage this business' }), b.verified ? 'This is how customers see your page.' : 'Customers can’t see this page until the Vendora team approves your business.'),
      el('a', { class: 'btn btn-primary btn-sm', href: `/manage.html?id=${encodeURIComponent(b._id)}`, text: 'Owner tools' })) : null;

    // products
    const productCard = (p) => {
      const photo = productPhoto(p);
      const price = typeof p.price === 'number' && p.price > 0 ? p.price : null;
      const inStock = p.inStock !== false;
      return el('div', { class: 'card product' },
        el('div', { class: 'product-img' }, photo ? el('img', { src: photo, alt: '', loading: 'lazy' }) : cat.icon),
        el('div', { class: 'product-info' },
          el('div', { style: { fontWeight: '800', color: 'var(--deep)' }, text: p.name }),
          p.description ? el('div', { class: 'small muted', text: p.description }) : null,
          el('div', { class: 'price', text: price ? ghs(price) : 'Price on request' }),
          inStock ? null : el('span', { class: 'tag red', text: 'Out of stock' })),
        !inStock ? null
          : canPay && price ? el('button', { class: 'btn btn-primary btn-sm', text: 'Buy', onclick: () => payBusiness(b, p) })
          : phone ? el('a', { class: 'btn btn-outline btn-sm', href: waText(`Hello ${b.businessName}, I saw "${p.name}"${price ? ` (${ghs(price)})` : ''} on Vendora Africa and would like to order.`), target: '_blank', rel: 'noopener', text: 'Order' }) : null);
    };

    const hours = b.businessHours && DAYS.some((d) => b.businessHours[d] && (b.businessHours[d].closed || b.businessHours[d].open)) ? b.businessHours : null;

    const main = el('div', { style: { display: 'grid', gap: '20px' } },
      el('div', { class: 'card card-pad' },
        el('h2', { style: { fontSize: '22px' }, text: 'About' }),
        el('p', { class: b.description ? '' : 'muted', style: { marginTop: '8px' }, text: b.description || `${b.businessName} hasn't added a description yet.` })),
      el('div', {},
        el('h2', { style: { fontSize: '22px', marginBottom: '12px' }, text: `Products${products.length ? ` (${products.length})` : ''}` }),
        products.length
          ? el('div', { class: 'grid grid-2' }, products.map(productCard))
          : el('div', { class: 'card empty' }, el('b', { text: 'No products listed yet' }), el('p', { text: 'Call or message the business to ask what they have.' }))));

    const side = el('aside', { class: 'side' },
      el('div', { class: 'card card-pad' },
        el('h3', { text: 'Contact' }),
        el('div', { style: { marginTop: '8px' } },
          b.phoneNumber ? el('div', { class: 'detail-row' }, el('span', { class: 'muted', text: 'Phone' }), el('b', { text: localPhone(b.phoneNumber) })) : null,
          place(b) ? el('div', { class: 'detail-row' }, el('span', { class: 'muted', text: 'Location' }), el('b', { text: place(b) })) : null,
          b.location?.address ? el('div', { class: 'detail-row' }, el('span', { class: 'muted', text: 'Address' }), el('b', { text: b.location.address })) : null,
          el('div', { class: 'detail-row' }, el('span', { class: 'muted', text: 'Category' }), el('b', { text: cat.name }))),
        canPay ? el('button', { class: 'btn btn-primary btn-block', style: { marginTop: '14px' }, text: '💳 Pay with Mobile Money', onclick: () => payBusiness(b, null) }) : null,
        canPay ? el('p', { class: 'small muted', style: { marginTop: '8px' }, text: 'Payments go straight to this business through Paystack. Only pay sellers you trust.' })
          : el('p', { class: 'small muted', style: { marginTop: '12px' }, text: 'This business doesn’t take online payments yet. Call or WhatsApp them to order.' })),
      hours ? el('div', { class: 'card card-pad' },
        el('h3', { text: 'Opening hours' }),
        el('div', { style: { marginTop: '8px' } }, DAYS.map((d) => {
          const h = hours[d] || {};
          const closed = h.closed || !h.open;
          return el('div', { class: 'hours-row' }, el('span', { text: d[0].toUpperCase() + d.slice(1) }), el('b', { style: closed ? { color: 'var(--red)' } : null, text: closed ? 'Closed' : `${time12(h.open)} – ${time12(h.close)}` }));
        }))) : null,
      el('div', { class: 'card card-pad' },
        el('h3', { text: 'Problem with this business?' }),
        el('p', { class: 'small muted', style: { marginTop: '6px' }, text: 'Tell us and our team will look into it.' }),
        el('a', { class: 'btn btn-outline btn-sm', style: { marginTop: '10px' }, href: '/help.html#message', text: 'Report it' })));

    fill($('#page'), hero, el('section', { class: 'section', style: { paddingTop: '28px' } }, el('div', { class: 'wrap' }, ownerBar, el('div', { class: 'layout' }, main, side))));
  }

  // Customer pays the business (a product, or an amount agreed with the seller)
  function payBusiness(b, product) {
    let qty = 1;
    let amount = 0;
    const name = el('input', { class: 'input', placeholder: 'So the seller knows who paid', autocomplete: 'name' });
    const note = el('input', { class: 'input', placeholder: 'e.g. size, colour, delivery area', maxlength: '200' });
    const listeners = [];
    const changed = () => listeners.forEach((fn) => fn());
    const unit = product ? product.price : 0;
    const qtyLabel = el('b', { text: '1' });
    const amountInput = el('input', { class: 'input', inputmode: 'decimal', placeholder: 'e.g. 150', oninput: () => { amount = Number(amountInput.value.replace(/,/g, '')) || 0; changed(); } });

    momoPayment({
      title: product ? `Buy ${product.name}` : `Pay ${b.businessName}`,
      amountText: () => ghs(product ? Math.round(unit * qty * 100) / 100 : amount),
      fields: () => ({
        node: el('div', { class: 'form' },
          product
            ? el('div', { class: 'card card-pad', style: { display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'none' } },
              el('div', { style: { flex: '1' } }, el('b', { text: product.name }), el('div', { class: 'small muted', text: `${ghs(unit)} each · from ${b.businessName}` })),
              el('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-label': 'Fewer', text: '−', onclick: () => { qty = Math.max(1, qty - 1); qtyLabel.textContent = qty; changed(); } }),
              qtyLabel,
              el('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-label': 'More', text: '+', onclick: () => { qty = Math.min(50, qty + 1); qtyLabel.textContent = qty; changed(); } }))
            : el('label', { class: 'field' }, `Amount to pay ${b.businessName} (GHS)`, amountInput, el('small', { text: 'Pay only an amount you have agreed with the seller.' })),
          el('label', { class: 'field' }, 'Your name', name),
          el('label', { class: 'field' }, 'Note for the seller (optional)', note)),
        onChange: (fn) => listeners.push(fn),
        validate: () => {
          if (name.value.trim().length < 2) return 'Enter your name so the seller knows who paid.';
          if (!product && !(amount >= 1 && amount <= 10000)) return 'Enter an amount between GHS 1 and GHS 10,000.';
          return '';
        },
        values: () => ({}),
      }),
      start: ({ provider, phone }) => api('/payments/order', { method: 'POST', body: JSON.stringify({
        businessId: b._id, provider, phone, customerName: name.value.trim(), note: note.value.trim() || undefined,
        ...(product ? { productId: product._id, quantity: qty } : { amount }),
      }) }),
      successText: (p) => `${ghs(p.amount)} was paid to ${b.businessName}${p.productName ? ` for ${p.productName}` : ''}. Contact them to arrange pickup or delivery.`,
    });
  }
})();
