// Turn an API product ({ name, price, currency, images, inStock, ... }) into what the screens show.
export const normalizeProduct = (p = {}, i = 0) => ({
  id: p._id || p.id || `p${i}`,
  name: p.name || 'Product',
  category: p.category || '',
  description: p.description || '',
  price: typeof p.price === 'number' ? `${p.currency || 'GHS'} ${p.price.toLocaleString('en-GH')}` : null,
  priceValue: typeof p.price === 'number' && p.price > 0 ? p.price : null,
  image: Array.isArray(p.images) ? p.images[0] : undefined,
  inStock: p.inStock !== false,
});

export const normalizeProducts = (list) => (Array.isArray(list) ? list : []).map(normalizeProduct);
