// Pricing page: prices come from the backend (backend/config/pricing.js)
(() => {
  const { $, el, fill, ghs, CATEGORIES } = V;
  // Small real photo for each business type (same photos as the Browse page)
  const photo = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]).img;

  const render = (pricing) => {
    const free = pricing?.freeDays || 30;
    const grace = pricing?.graceDays || 7;
    $('#freeBadge').textContent = `First ${free} days free`;

    if (pricing) {
      const tiers = Object.values(pricing.categories.reduce((acc, c) => { (acc[c.price] = acc[c.price] || { price: c.price, cats: [] }).cats.push(c); return acc; }, {}))
        .sort((a, b) => a.price - b.price);
      const low = tiers[0]?.price;
      $('#lead').textContent = `Register free. Once approved, your first ${free} days are free. After that, from ${ghs(low)} a month depending on your type of business.`;
      fill($('#tiers'), tiers.map((t, i) => el('div', { class: `card tier tier-${Math.min(i, 2)}` },
        el('div', { class: 'tier-head' },
          el('div', { class: 'small', style: { fontWeight: '800', letterSpacing: '.08em', textTransform: 'uppercase', opacity: '.85' }, text: i === 0 ? 'Lowest price' : `${t.cats.length} business types` }),
          el('div', { class: 'price' }, el('small', { text: 'GHS ' }), String(t.price)),
          el('div', { class: 'per', text: 'per month' })),
        el('div', { class: 'tier-body' }, t.cats.map((c) => el('span', { class: 'chip-static chip-photo' },
          el('img', { src: `/assets/img/${photo(c.id)}`, alt: '', loading: 'lazy', decoding: 'async' }),
          el('span', { text: c.name })))))));
    } else {
      fill($('#tiers'), el('div', { class: 'card empty' }, el('b', { text: 'Prices could not be loaded' }), el('p', { text: 'Please check your connection and refresh.' })));
    }

    const faqs = [
      ['Do I need to pay to register?', `No. Registering is free, and after we approve your business your first ${free} days cost nothing.`],
      ['How do I pay?', 'With Mobile Money: MTN MoMo, Telecel Cash or AirtelTigo Money. Use “Manage my business” on this website or in the app, and approve with your own PIN.'],
      ['Will money be taken automatically?', 'No. You choose when to pay each month, and we remind you before your time runs out.'],
      ['What if I pay early?', 'Nothing is lost. Paying early adds 30 days to the end of your current month.'],
      ['Why does the price depend on my business type?', 'Different kinds of businesses get different value from being listed. Food sellers pay the least so small traders can join easily.'],
    ];
    fill($('#faq'), faqs.map(([q, a]) => el('details', {}, el('summary', { text: q }), el('p', { text: a }))));
  };

  V.getPaymentConfig().then((c) => render(c.pricing)).catch(() => render(null));
})();
