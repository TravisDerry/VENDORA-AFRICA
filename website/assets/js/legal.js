// Terms of Use & Privacy Policy (text shared with the app: assets/js/legal-data.js)
(() => {
  const { $, el, fill } = V;
  const { LEGAL_UPDATED, TERMS, PRIVACY } = window.VENDORA_LEGAL;
  $('#updated').textContent = `Last updated ${LEGAL_UPDATED}`;
  const show = (tab) => {
    document.querySelectorAll('.tabs button').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    fill($('#content'), el('h2', { text: tab === 'terms' ? 'Terms of Use' : 'Privacy Policy' }),
      (tab === 'terms' ? TERMS : PRIVACY).map((s) => el('div', { class: 'card card-pad' }, el('h3', { text: s.title }), s.body.map((p) => el('p', { class: 'muted', style: { marginTop: '8px' }, text: p })))));
    history.replaceState(null, '', tab === 'privacy' ? '#privacy' : location.pathname);
  };
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show(location.hash === '#privacy' ? 'privacy' : 'terms');
})();
