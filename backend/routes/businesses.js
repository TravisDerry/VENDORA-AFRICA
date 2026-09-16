const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();
const memoryBusinesses = [];

function useMemoryStore() {
  return mongoose.connection.readyState !== 1;
}

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
    rating: item.rating || 0,
    views: item.views || 0,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['phones', 'cosmetics', 'fashion', 'food', 'hardware', 'other']),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('country').optional().isLength({ min: 2, max: 50 }),
  query('verified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, category, search, country, verified, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    if (useMemoryStore()) {
      const records = memoryBusinesses
        .filter((item) => {
          if (category && item.category !== category) return false;
          if (country && item.country !== country.toLowerCase()) return false;
          if (verified !== undefined && Boolean(item.verified) !== (verified === 'true')) return false;
          if (search) {
            const haystack = `${item.businessName || ''} ${item.description || ''} ${item.category || ''} ${item.country || ''}`.toLowerCase();
            if (!haystack.includes(search.toLowerCase())) return false;
          }
          return true;
        })
        .slice((page - 1) * limit, page * limit)
        .map(normalizeMemoryBusiness);

      return res.json({
        businesses: records,
        pagination: {
          current: parseInt(page),
          pages: Math.max(1, Math.ceil(memoryBusinesses.length / limit)),
          total: memoryBusinesses.length,
          limit: parseInt(limit)
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

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const businesses = await Business.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Business.countDocuments(filter);

    res.json({
      businesses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
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

router.get('/:id', async (req, res) => {
  try {
    if (useMemoryStore()) {
      const business = memoryBusinesses.find((item) => item._id === req.params.id);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }
      return res.json(normalizeMemoryBusiness(business));
    }

    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    await Business.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(business);
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.post('/', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('businessName').trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
  body('phoneNumber').trim().isMobilePhone().withMessage('Valid phone number required'),
  body('email').trim().isEmail().withMessage('Valid email required'),
  body('businessCategory').isIn(['phones', 'cosmetics', 'fashion', 'food', 'hardware', 'aluminum', 'education', 'other']),
  body('country').trim().isLength({ min: 2, max: 50 }).withMessage('Country required'),
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

      const record = {
        _id: `memory-${Date.now()}`,
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
          verified: record.verified
        },
        verificationToken: 'memory-demo-token'
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
      createdAt: new Date()
    });

    await business.save();
    const verificationToken = business.generateVerificationToken();
    res.status(201).json({
      message: 'Business registered successfully',
      business: {
        id: business._id,
        businessName: business.businessName,
        email: business.email,
        status: business.status,
        verified: business.verified
      },
      verificationToken
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

module.exports = router;
