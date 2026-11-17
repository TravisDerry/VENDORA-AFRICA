// Browse: server-side search + category filter, 12 per page with "Load more"
(() => {
  const { $, el, fill, api, CATEGORIES, businessCard, params } = V;
  const PAGE = 12;
  let category = params().get('category') || 'all';
  let q = params().get('q') || '';
  let page = 0;
  let pages = 1;
  let request = 0;

  $('#q').value = q;

  // Category tiles: small photo + label; "All" is a brand-colour tile
  const chips = () => fill($('#chips'), [{ id: 'all', short: 'All' }, ...CATEGORIES].map((c) => el('button', {
    class: `bcat${c.id === category ? ' on' : ''}`, role: 'radio', 'aria-checked': String(c.id === category), type: 'button', title: c.name || 'All businesses',
    onclick: () => { category = c.id; chips(); load(true); },
  },
  c.img
    ? el('img', { class: 'bcat-img', src: `/assets/img/${c.img}`, alt: '', loading: 'lazy', decoding: 'async' })
    : el('span', { class: 'bcat-img bcat-all', 'aria-hidden': 'true' }, el('span', { class: 'bcat-dots' }, el('i'), el('i'), el('i'), el('i'))),
  el('span', { class: 'bcat-label', text: c.short }))));

  const updateUrl = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category !== 'all') p.set('category', category);
    history.replaceState(null, '', `/browse.html${p.toString() ? `?${p}` : ''}`);
  };

  async function load(reset) {
    const id = ++request;
    if (reset) { page = 0; fill($('#results'), el('div', { class: 'loading', text: 'Loading…' })); $('#more').hidden = true; }
    updateUrl();
    const p = new URLSearchParams({ page: String(page + 1), limit: String(PAGE) });
    if (category !== 'all') p.set('category', category);
    if (q) p.set('search', q);
    try {
      const { businesses, pagination } = await api(`/businesses?${p}`);
      if (id !== request) return;
      page = pagination.current; pages = pagination.pages;
      if (reset) fill($('#results'));
      if (!businesses.length && page === 1) {
        $('#results').append(el('div', { class: 'card empty', style: { gridColumn: '1 / -1' } },
          el('b', { text: q || category !== 'all' ? 'No businesses found' : 'No businesses yet' }),
          el('p', { text: q || category !== 'all' ? 'Try a different search or category.' : 'Vendora Africa is just getting started. Own a business? List it free.' }),
          q || category !== 'all'
            ? el('button', { class: 'btn btn-outline', style: { marginTop: '14px' }, text: 'Clear filters', onclick: () => { q = ''; category = 'all'; $('#q').value = ''; chips(); load(true); } })
            : el('a', { class: 'btn btn-primary', style: { marginTop: '14px' }, href: '/register.html', text: 'List your business' })));
      }
      businesses.forEach((b) => $('#results').append(businessCard(b)));
      $('#count').textContent = pagination.total ? `${pagination.total} business${pagination.total === 1 ? '' : 'es'}` : '';
      $('#more').hidden = page >= pages;
    } catch (e) {
      if (id !== request) return;
      fill($('#results'), el('div', { class: 'card empty', style: { gridColumn: '1 / -1' } }, el('b', { text: "Can't load businesses" }), el('p', { text: e.message })));
    }
  }

  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); q = $('#q').value.trim(); load(true); });
  $('#more').addEventListener('click', () => load(false));
  chips();
  load(true);
})();
