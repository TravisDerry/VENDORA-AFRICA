const CATEGORY_ALIASES = {
  phones: ['phones', 'phones & electronics', 'phone & electronics', 'electronics'],
  cosmetics: ['cosmetics', 'cosmetics & beauty', 'beauty'],
  fashion: ['fashion', 'fashion & clothing', 'clothing'],
  food: ['food', 'food & grocery', 'grocery'],
  hardware: ['hardware', 'hardware & building', 'building', 'construction'],
  aluminum: ['aluminum', 'aluminum & glass works', 'glass works'],
  education: ['education'],
  other: ['other']
};

const COUNTRY_ALIASES = {
  ghana: ['ghana'],
  nigeria: ['nigeria'],
  kenya: ['kenya'],
  senegal: ['senegal'],
  ivorycoast: ['ivory coast', 'ivorycoast', 'cote d ivoire', 'côte d ivoire'],
  other: ['other']
};

function normalizeBusinessCategory(value) {
  if (typeof value !== 'string') return 'other';

  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return 'other';

  const match = Object.entries(CATEGORY_ALIASES).find(([, variants]) =>
    variants.includes(cleaned)
  );

  return match ? match[0] : (cleaned.includes('phone') ? 'phones' : cleaned.includes('cosmetic') ? 'cosmetics' : cleaned.includes('fashion') ? 'fashion' : cleaned.includes('food') ? 'food' : cleaned.includes('hardware') ? 'hardware' : cleaned.includes('aluminum') ? 'aluminum' : cleaned.includes('education') ? 'education' : 'other');
}

function normalizeCountry(value) {
  if (typeof value !== 'string') return 'other';

  const cleaned = value.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'other';

  const match = Object.entries(COUNTRY_ALIASES).find(([, variants]) =>
    variants.includes(cleaned)
  );

  if (match) return match[0];

  if (cleaned.includes('ghana')) return 'ghana';
  if (cleaned.includes('nigeria')) return 'nigeria';
  if (cleaned.includes('kenya')) return 'kenya';
  if (cleaned.includes('senegal')) return 'senegal';
  if (cleaned.includes('ivory') || cleaned.includes('cote') || cleaned.includes('côte')) return 'ivorycoast';
  return 'other';
}

function buildBusinessPayload(formData = {}) {
  return {
    firstName: String(formData.firstName || '').trim(),
    lastName: String(formData.lastName || '').trim(),
    businessName: String(formData.businessName || '').trim(),
    phoneNumber: String(formData.phoneNumber || '').trim(),
    businessCategory: normalizeBusinessCategory(formData.businessCategory),
    country: normalizeCountry(formData.country),
    email: String(formData.email || '').trim(),
    businessDescription: String(formData.businessDescription || '').trim(),
    city: '',
    address: ''
  };
}

module.exports = {
  CATEGORY_ALIASES,
  COUNTRY_ALIASES,
  normalizeBusinessCategory,
  normalizeCountry,
  buildBusinessPayload
};
