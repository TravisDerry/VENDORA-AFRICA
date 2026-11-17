const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Business = require('../models/Business');
const auth = require('../middleware/auth');
const { generateManageKey, hashManageKey, manageKeyMatches } = require('../utils/manageKey');
const pricing = require('../config/pricing');
const multer = require('multer');
const { savePhoto, deletePhoto, MAX_BYTES } = require('../services/photoStorage');

// Photos arrive as multipart form data (field name "photo"), kept in memory until saved
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }).single('photo');
// The app sends photos as base64 text in JSON ({ photo: "<base64>" }); browsers may also send a
// normal multipart file upload. Either way the photo ends up in req.file.buffer.
const receivePhoto = (req, res, next) => {
  if (req.is('application/json')) {
    const raw = typeof req.body?.photo === 'string' ? req.body.photo.replace(/^data:[^;]+;base64,/, '') : '';
    if (!raw) return res.status(400).json({ error: 'No photo received' });
    req.file = { buffer: Buffer.from(raw, 'base64') };
    return next();
  }
  return receivePhotoMultipart(req, res, next);
};
const receivePhotoMultipart = (req, res, next) => photoUpload(req, res, (err) => {
  if (!err) return next();
  const tooBig = err.code === 'LIMIT_FILE_SIZE';
  res.status(400).json({ error: tooBig ? 'Photo is too large (max 5 MB)' : 'Could not read the photo' });
});
const isOurPhotoUrl = (v) => /^https?:\/\/\S+$/i.test(v) || /^\/uploads\/[\w.-]+$/.test(v);

// Public JSON for a business, with its listing status (free month / paid / grace / hidden)
const withListing = (b) => {
  const json = typeof b.toJSON === 'function' ? b.toJSON() : { ...b };
  delete json.manageKeyHash;
  delete json.payout;
  delete json.verificationNote; // Vendora team's private note
  return { ...json, listing: pricing.listingStatus(b) };
};

const router = express.Router();
const memoryBusinesses = [];

// Temporary in-memory store: ONLY for local testing (ALLOW_MEMORY_STORE=true). In real use the API
// refuses requests while the database is down (see server.js) so nothing is silently lost.
function useMemoryStore() {
  return process.env.ALLOW_MEMORY_STORE === 'true' && mongoose.connection.readyState !== 1;
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTABLE = ['createdAt', 'businessName', 'views'];

// New businesses stay hidden from customers until the Vendora team approves them (admin page > Verify).
// Set REQUIRE_APPROVAL=false in .env to let new businesses go live immediately instead.
const approvalRequired = () => process.env.REQUIRE_APPROVAL !== 'false';

function normalizeMemoryBusiness(item) {
  return {
    _id: item._id,
    owner: item.owner,
    businessName: item.businessName,
    phoneNumber: item.phoneNumber,
    email: item.email,
    category: item.category,
    country: item.country,
    description: item.description || '',
    location: item.location || { city: '', address: '' },
    verified: !!item.verified,
    status: item.status || 'pending',
    plan: item.plan || 'free',
    acceptsPayments: !!item.acceptsPayments,
    businessHours: item.businessHours || null,
    subscription: item.subscription || {},
    listing: pricing.listingStatus(item),
    rating: item.rating || 0,
    views: item.views || 0,
    products: item.products || [],
    images: item.images || {},
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

function normalizeBusinessCategory(value) {
  if (typeof value !== 'string') return 'other';

  const category = value.trim().toLowerCase();
  const aliases = {
    phones: ['phones', 'phones & electronics', 'phone & electronics', 'electronics'],
    cosmetics: ['cosmetics', 'cosmetics & beauty', 'beauty'],
    fashion: ['fashion', 'fashion & clothing', 'clothing'],
    food: ['food', 'food & grocery', 'grocery'],
    hardware: ['hardware', 'hardware & building', 'building'],
    aluminum: ['aluminum', 'aluminum & glass works', 'glass works'],
    education: ['education'],
    other: ['other']
  };

  const match = Object.entries(aliases).find(([, variants]) => variants.includes(category));
  return match ? match[0] : 'other';
}

function normalizeCountry(value) {
  if (typeof value !== 'string') return 'other';

  const country = value.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  const aliases = {
    ghana: ['ghana'],
    nigeria: ['nigeria'],
    kenya: ['kenya'],
    senegal: ['senegal'],
    ivorycoast: ['ivory coast', 'ivorycoast', 'cote d ivoire', 'côte d ivoire'],
    other: ['other']
  };

  const match = Object.entries(aliases).find(([, variants]) => variants.includes(country));
  if (match) return match[0];

  if (country.includes('ghana')) return 'ghana';
  if (country.includes('nigeria')) return 'nigeria';
  if (country.includes('kenya')) return 'kenya';
  if (country.includes('senegal')) return 'senegal';
  if (country.includes('ivory') || country.includes('cote') || country.includes('côte')) return 'ivorycoast';
  return 'other';
}

function normalizePhoneNumber(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').trim();
}

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['phones', 'cosmetics', 'fashion', 'food', 'hardware', 'aluminum', 'education', 'other']),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('country').optional().isLength({ min: 2, max: 50 }),
  query('verified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, search, country, verified, sortOrder = 'desc' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const q = typeof search === 'string' ? search.trim() : '';

    if (useMemoryStore()) {
      const matching = memoryBusinesses
        .filter((item) => {
          if (!pricing.listingStatus(item).visible) return false; // unpaid past the grace period
          if (approvalRequired() && !item.verified) return false; // not approved yet
          if (category && item.category !== category) return false;
          if (country && item.country !== country.toLowerCase()) return false;
          if (verified !== undefined && Boolean(item.verified) !== (verified === 'true')) return false;
          if (q) {
            const haystack = `${item.businessName || ''} ${item.description || ''} ${item.category || ''} ${item.country || ''} ${item.location?.city || ''}`.toLowerCase();
            if (!haystack.includes(q.toLowerCase())) return false;
          }
          return true;
        });
      const records = matching.slice((page - 1) * limit, page * limit).map(normalizeMemoryBusiness);

      return res.json({
        businesses: records,
        pagination: {
          current: page,
          pages: Math.max(1, Math.ceil(matching.length / limit)),
          total: matching.length,
          limit
        },
        filters: {
          category,
          search,
          country,
          verified
        }
      });
    }

    const filter = {};
    if (category) filter.category = category;
    if (country) filter.country = country.toLowerCase();
    if (verified !== undefined) filter.verified = verified === 'true';

    if (q) {
      // Escaped so typed symbols can't break or slow down the search
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { businessName: rx },
        { category: rx },
        { description: rx },
        { 'location.city': rx },
        { tags: rx }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: -1 };

    // Hide businesses whose free month / paid month ended more than the grace period ago
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, pricing.visibleFilter()];
      delete filter.$or;
    } else {
      Object.assign(filter, pricing.visibleFilter());
    }
    // Only approved businesses are shown to customers
    if (approvalRequired()) filter.verified = true;

    const businesses = await Business.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v -manageKeyHash -payout -verificationNote');

    const total = await Business.countDocuments(filter);

    res.json({
      businesses: businesses.map(withListing),
      pagination: {
        current: page,
        pages: Math.max(1, Math.ceil(total / limit)),
        total,
        limit: parseInt(limit)
      },
      filters: {
        category,
        search,
        country,
        verified
      }
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Owner sign-in: find the business that belongs to an owner key (sent in X-Manage-Key).
// Works before the business is approved. Wrong keys count towards the wrong-key rate limit.
router.get('/mine', async (req, res) => {
  try {
    const key = req.get('x-manage-key');
    if (!key || key.length < 10) return res.status(401).json({ error: 'Enter your owner key' });
    let business;
    if (useMemoryStore()) business = memoryBusinesses.find((b) => manageKeyMatches(key, b.manageKeyHash));
    else business = await Business.findOne({ manageKeyHash: hashManageKey(key) }).select('+manageKeyHash');
    if (!business) return res.status(403).json({ error: 'That owner key does not match any business' });
    res.json(useMemoryStore() ? normalizeMemoryBusiness(business) : withListing(business));
  } catch (error) {
    console.error('Owner sign-in error:', error);
    res.status(500).json({ error: 'Could not check the owner key' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (useMemoryStore()) {
      const business = memoryBusinesses.find((item) => item._id === req.params.id);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }
      if (approvalRequired() && !business.verified && !manageKeyMatches(req.get('x-manage-key'), business.manageKeyHash)) {
        return res.status(404).json({ error: 'This business is not available yet' });
      }
      return res.json(normalizeMemoryBusiness(business));
    }

    const business = await Business.findById(req.params.id).select('+manageKeyHash');
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    // Not approved yet: only its owner (with the owner key) can open it
    if (approvalRequired() && !business.verified && !manageKeyMatches(req.get('x-manage-key'), business.manageKeyHash)) {
      return res.status(404).json({ error: 'This business is not available yet' });
    }

    // ?track=0 is used when owners open their own page from "Manage my business"
    if (req.query.track !== '0') await Business.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(withListing(business));
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.post('/', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('businessName').trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
  body('phoneNumber').customSanitizer(normalizePhoneNumber).custom((value) => {
    if (!/^\+?[1-9]\d{8,15}$/.test(value || '')) {
      throw new Error('Valid phone number required');
    }
    return true;
  }),
  body('email').trim().isEmail().withMessage('Valid email required'),
  body('businessCategory').customSanitizer(normalizeBusinessCategory).isIn(['phones', 'cosmetics', 'fashion', 'food', 'hardware', 'aluminum', 'education', 'other']),
  body('country').customSanitizer(normalizeCountry).trim().isLength({ min: 2, max: 50 }).withMessage('Country required'),
  body('businessDescription').optional().trim().isLength({ max: 500 }),
  body('city').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, businessName, phoneNumber, email, businessCategory, country, businessDescription, city, address } = req.body;

    if (useMemoryStore()) {
      const existingBusiness = memoryBusinesses.find((item) => item.email === email || item.phoneNumber === phoneNumber || item.businessName === businessName);
      if (existingBusiness) {
        return res.status(409).json({
          error: 'Business already registered',
          field: existingBusiness.email === email ? 'email' : existingBusiness.phoneNumber === phoneNumber ? 'phoneNumber' : 'businessName'
        });
      }

      const manageKey = generateManageKey();
      const record = {
        _id: `memory-${Date.now()}`,
        manageKeyHash: hashManageKey(manageKey),
        products: [],
        owner: { firstName, lastName },
        businessName,
        phoneNumber,
        email,
        category: businessCategory,
        country: (country || '').toLowerCase(),
        description: businessDescription || '',
        location: { city: city || '', address: address || '' },
        verified: false,
        status: 'pending',
        plan: 'free',
        subscription: pricing.freeMonth(),
        rating: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      memoryBusinesses.unshift(record);

      return res.status(201).json({
        message: 'Business registered successfully',
        business: {
          id: record._id,
          businessName: record.businessName,
          email: record.email,
          status: record.status,
          verified: record.verified,
          listing: pricing.listingStatus(record)
        },
        verificationToken: 'memory-demo-token',
        approvalRequired: approvalRequired(),
        manageKey
      });
    }

    const existingBusiness = await Business.findOne({
      $or: [
        { email },
        { phoneNumber },
        { businessName }
      ]
    });

    if (existingBusiness) {
      return res.status(409).json({
        error: 'Business already registered',
        field: existingBusiness.email === email ? 'email' : existingBusiness.phoneNumber === phoneNumber ? 'phoneNumber' : 'businessName'
      });
    }

    const business = new Business({
      owner: { firstName, lastName },
      businessName,
      phoneNumber,
      email,
      category: businessCategory,
      country: country.toLowerCase(),
      description: businessDescription || '',
      location: { city: city || '', address: address || '' },
      verified: false,
      status: 'pending',
      plan: 'free',
      subscription: pricing.freeMonth(), // first month free
      createdAt: new Date()
    });

    // Owner key: returned once in this response, only its hash is stored
    const manageKey = generateManageKey();
    business.manageKeyHash = hashManageKey(manageKey);

    await business.save();
    const verificationToken = business.generateVerificationToken();
    res.status(201).json({
      message: 'Business registered successfully',
      business: {
        id: business._id,
        businessName: business.businessName,
        email: business.email,
        status: business.status,
        verified: business.verified,
        listing: pricing.listingStatus(business)
      },
      verificationToken,
      approvalRequired: approvalRequired(),
      manageKey
    });
  } catch (error) {
    console.error('Register business error:', error);
    res.status(500).json({ error: 'Failed to register business' });
  }
});

router.put('/:id', auth, [
  body('businessName').optional().trim().isLength({ min: 2, max: 100 }),
  body('phoneNumber').optional().trim().isMobilePhone(),
  body('description').optional().trim().isLength({ max: 500 }),
  body('address').optional().trim().isLength({ max: 200 }),
  body('city').optional().trim().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (useMemoryStore()) {
      const index = memoryBusinesses.findIndex((item) => item._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Business not found' });
      }

      memoryBusinesses[index] = { ...memoryBusinesses[index], ...req.body, updatedAt: new Date().toISOString() };
      return res.json({ message: 'Business updated successfully', business: normalizeMemoryBusiness(memoryBusinesses[index]) });
    }

    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    if (business.email !== req.user.email) {
      return res.status(403).json({ error: 'Not authorized to update this business' });
    }

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) business[key] = req.body[key];
    });

    business.updatedAt = new Date();
    await business.save();

    res.json({ message: 'Business updated successfully', business });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// ---------- Owner-only product management ----------
// Requests must send the business's owner key in the X-Manage-Key header.

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function loadOwnedBusiness(req, res) {
  const key = req.get('x-manage-key');
  if (!key) {
    res.status(401).json({ error: 'Owner key required' });
    return null;
  }

  if (useMemoryStore()) {
    const business = memoryBusinesses.find((item) => item._id === req.params.id);
    if (!business) { res.status(404).json({ error: 'Business not found' }); return null; }
    if (!manageKeyMatches(key, business.manageKeyHash)) { res.status(403).json({ error: 'Owner key is not valid for this business' }); return null; }
    return business;
  }

  if (!isObjectId(req.params.id)) { res.status(404).json({ error: 'Business not found' }); return null; }
  const business = await Business.findById(req.params.id).select('+manageKeyHash');
  if (!business) { res.status(404).json({ error: 'Business not found' }); return null; }
  if (!manageKeyMatches(key, business.manageKeyHash)) { res.status(403).json({ error: 'Owner key is not valid for this business' }); return null; }
  return business;
}

const toPublicProduct = (p) => ({
  _id: p._id,
  name: p.name,
  description: p.description || '',
  price: p.price,
  currency: p.currency || 'GHS',
  category: p.category || '',
  images: p.images || [],
  inStock: p.inStock !== false,
  createdAt: p.createdAt
});

// Check an owner key (used by the app before showing owner tools)
// Owner edits public details (name, phone and email are changed by the Vendora team)
router.put('/:id/details', [
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('city').optional().trim().isLength({ max: 50 }).withMessage('City must be under 50 characters'),
  body('address').optional().trim().isLength({ max: 120 }).withMessage('Address must be under 120 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    if (typeof req.body.description === 'string') business.description = req.body.description;
    const loc = { ...(business.location?.toObject ? business.location.toObject() : business.location || {}) };
    if (typeof req.body.city === 'string') loc.city = req.body.city;
    if (typeof req.body.address === 'string') loc.address = req.body.address;
    business.location = loc;
    if (!useMemoryStore()) await business.save();
    res.json({ message: 'Details saved', description: business.description || '', location: loc });
  } catch (error) {
    console.error('Save details error:', error);
    res.status(500).json({ error: 'Failed to save details' });
  }
});

// Owner uploads (or replaces) the business's cover photo
router.post('/:id/photo', receivePhoto, async (req, res) => {
  try {
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    const url = await savePhoto(req.file && req.file.buffer, 'vendora/covers');
    const old = business.images && business.images.cover;
    if (typeof business.set === 'function') business.set('images.cover', url);
    else business.images = { ...(business.images || {}), cover: url };
    if (!useMemoryStore()) await business.save();
    if (old && old !== url) deletePhoto(old);
    res.json({ message: 'Cover photo saved', cover: url });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('Cover photo error:', error);
    res.status(500).json({ error: 'Failed to save the photo' });
  }
});

// Owner removes the cover photo (the app then shows the plain branded cover)
router.delete('/:id/photo', async (req, res) => {
  try {
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    const old = business.images && business.images.cover;
    if (typeof business.set === 'function') business.set('images.cover', undefined);
    else business.images = { ...(business.images || {}), cover: undefined };
    if (!useMemoryStore()) await business.save();
    if (old) deletePhoto(old);
    res.json({ message: 'Cover photo removed' });
  } catch (error) {
    console.error('Remove cover error:', error);
    res.status(500).json({ error: 'Failed to remove the photo' });
  }
});

// Owner uploads a product photo; the returned URL is then sent as imageUrl when adding the product
router.post('/:id/uploads', receivePhoto, async (req, res) => {
  try {
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    const url = await savePhoto(req.file && req.file.buffer, 'vendora/products');
    res.status(201).json({ url });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('Product photo error:', error);
    res.status(500).json({ error: 'Failed to save the photo' });
  }
});

// Owner sets opening hours. Body: { hours: { monday: { open: '08:00', close: '18:00', closed: false }, ... } }
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // 24-hour HH:MM
router.put('/:id/hours', async (req, res) => {
  try {
    const input = req.body && typeof req.body.hours === 'object' ? req.body.hours : null;
    if (!input) return res.status(400).json({ error: 'Opening hours are required' });
    const hours = {};
    for (const day of DAYS) {
      const d = input[day] || {};
      if (d.closed) {
        hours[day] = { closed: true, open: '', close: '' };
      } else {
        if (!TIME.test(d.open || '') || !TIME.test(d.close || '')) {
          return res.status(400).json({ error: `Enter opening and closing times for ${day[0].toUpperCase() + day.slice(1)}, or mark it closed` });
        }
        if (d.close <= d.open) {
          return res.status(400).json({ error: `Closing time must be after opening time on ${day[0].toUpperCase() + day.slice(1)}` });
        }
        hours[day] = { closed: false, open: d.open, close: d.close };
      }
    }
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    business.businessHours = hours;
    if (!useMemoryStore()) await business.save();
    res.json({ message: 'Opening hours saved', businessHours: hours });
  } catch (error) {
    console.error('Save hours error:', error);
    res.status(500).json({ error: 'Failed to save opening hours' });
  }
});

router.post('/:id/verify-key', async (req, res) => {
  try {
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;
    res.json({ ok: true, businessName: business.businessName });
  } catch (error) {
    console.error('Verify key error:', error);
    res.status(500).json({ error: 'Failed to verify key' });
  }
});

router.post('/:id/products', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be 2-100 characters'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100000000 }).withMessage('Price must be a positive number').toFloat(),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).toUpperCase(),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be under 50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('imageUrl').optional({ values: 'falsy' }).trim().custom((v) => isOurPhotoUrl(v)).withMessage('Image must be an uploaded photo or a full http(s) link'),
  body('inStock').optional().isBoolean().toBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const business = await loadOwnedBusiness(req, res);
    if (!business) return;

    const { name, price, currency, category, description, imageUrl, inStock } = req.body;
    const product = {
      name,
      price: typeof price === 'number' && !Number.isNaN(price) ? price : undefined,
      currency: currency || 'GHS',
      category: category || '',
      description: description || '',
      images: imageUrl ? [imageUrl] : [],
      inStock: inStock !== false,
      createdAt: new Date()
    };

    if (useMemoryStore()) {
      product._id = `memory-product-${Date.now()}`;
      business.products = [product, ...(business.products || [])];
      business.updatedAt = new Date().toISOString();
      return res.status(201).json({ message: 'Product added', product: toPublicProduct(product), products: business.products.map(toPublicProduct) });
    }

    business.products.unshift(product);
    business.updatedAt = new Date();
    await business.save();
    res.status(201).json({ message: 'Product added', product: toPublicProduct(business.products[0]), products: business.products.map(toPublicProduct) });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.delete('/:id/products/:productId', async (req, res) => {
  try {
    const business = await loadOwnedBusiness(req, res);
    if (!business) return;

    const before = (business.products || []).length;
    if (useMemoryStore()) {
      business.products = (business.products || []).filter((p) => String(p._id) !== req.params.productId);
    } else {
      business.products = business.products.filter((p) => String(p._id) !== req.params.productId);
      await business.save();
    }
    if (business.products.length === before) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product removed', products: business.products.map(toPublicProduct) });
  } catch (error) {
    console.error('Remove product error:', error);
    res.status(500).json({ error: 'Failed to remove product' });
  }
});

// Shared with routes/payments.js: find a business and check its owner key.
async function findOwnedBusiness(id, key) {
  if (!key) return { status: 401, error: 'Owner key required' };
  let business;
  if (useMemoryStore()) {
    business = memoryBusinesses.find((item) => item._id === id);
  } else if (isObjectId(id)) {
    business = await Business.findById(id).select('+manageKeyHash +payout');
  }
  if (!business) return { status: 404, error: 'Business not found' };
  if (!manageKeyMatches(key, business.manageKeyHash)) return { status: 403, error: 'Owner key is not valid for this business' };
  return { business };
}

router.findOwnedBusiness = findOwnedBusiness;
router.useMemoryStore = useMemoryStore;
router.approvalRequired = approvalRequired;
router.memoryBusinesses = memoryBusinesses;

module.exports = router;
