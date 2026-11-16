// Home page
(() => {
  const { $, el, fill, api, ghs, CATEGORIES, businessCard } = V;

  $('#heroSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#q').value.trim();
    location.href = `/browse.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });

  // Category tiles
  fill($('#categories'), CATEGORIES.slice(0, 6).map((c) => el('a', { class: 'cat2 reveal', href: `/browse.html?category=${c.id}` },
    el('div', { class: 'cat2-img' }, el('img', { src: `/assets/img/${c.img}`, alt: '', loading: 'lazy' })),
    el('div', { class: 'cat2-label' }, el('b', { text: c.short }), el('span', { text: '→' })))));
  V.reveal();


  // Businesses
  (async () => {
    const box = $('#businesses');
    try {
      const { businesses } = await api('/businesses?limit=8');
      if (!businesses.length) {
        box.className = '';
        fill(box, el('div', { class: 'empty-feature' },
          el('div', {}, el('span', { class: 'kicker', text: 'Just getting started' }),
            el('h3', { text: 'Be one of the first businesses on Vendora' }),
            el('p', { text: 'We’re welcoming our very first sellers. List your business free and be among the first customers discover.' }),
            el('a', { class: 'btn btn-primary', href: '/register.html', text: 'List your business' })),
          el('img', { src: '/assets/img/entrepreneur.jpg', alt: '', loading: 'lazy' })));
        return;
      }
      fill(box, businesses.map(businessCard));
    } catch (e) {
      box.className = '';
      fill(box, el('div', { class: 'card empty' }, el('b', { text: 'We couldn’t load businesses just now' }), el('p', { text: e.message })));
    }
  })();

})();
