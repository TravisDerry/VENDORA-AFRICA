// Turn an API business record into what the screens show (shared by App.js and owner screens).
import { getCategory } from '../data/categories';
import { normalizeProducts } from './products';
import { normalizeHours } from './hours';

const titleCase = (v) => String(v || '').replace(/\b\w/g, (c) => c.toUpperCase());
const pickImage = (item) => {
  const imgs = item.images || {};
  return item.image || item.coverImage || imgs.cover || imgs.logo || (Array.isArray(imgs.gallery) ? imgs.gallery[0] : undefined) || item.logo;
};
export const normalizeBusiness = (item, index) => {
  const loc = item.location && typeof item.location === 'object' ? item.location : {};
  const place = typeof item.location === 'string' ? item.location : loc.city || loc.address;
  const country = titleCase(item.country);
  const category = item.category || 'other';
  const plan = item.badge;
  const image = pickImage(item);
  return {
    id: item._id || item.id || index + 1,
    name: item.businessName || item.name || 'Business',
    type: item.type || getCategory(category).fullName || titleCase(category) || 'General business',
    category,
    rating: Number(item.averageRating || item.rating || 0),
    badge: plan ? titleCase(plan) : null,
    verified: item.verified === true,
    phone: item.phoneNumber || item.phone || '',
    location: [titleCase(place), country].filter(Boolean).join(', ') || 'Ghana',
    description: item.description || '',
    image: typeof image === 'string' ? image : undefined,
    products: normalizeProducts(item.products),
    acceptsPayments: item.acceptsPayments === true,
    listing: item.listing || null,
    hours: normalizeHours(item.businessHours),
  };
};
