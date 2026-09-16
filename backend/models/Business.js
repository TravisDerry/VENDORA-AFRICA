const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const businessSchema = new mongoose.Schema({
  // Owner information
  owner: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    }
  },

  // Business information
  businessName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    unique: true
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },

  category: {
    type: String,
    required: true,
    enum: ['phones', 'cosmetics', 'fashion', 'food', 'hardware', 'aluminum', 'education', 'other']
  },

  country: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Location
  location: {
    city: {
      type: String,
      trim: true,
      maxlength: 50
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Business status
  verified: {
    type: Boolean,
    default: false
  },

  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },

  plan: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium'],
    default: 'free'
  },

  // Subscription
  subscription: {
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    },
    paymentMethod: String,
    lastPayment: Date
  },

  // Products and services
  products: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    price: Number,
    currency: {
      type: String,
      default: 'GHS'
    },
    category: String,
    images: [String],
    inStock: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Reviews and ratings
  reviews: [{
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    reviewerName: {
      type: String,
      required: true
    },
    reviewerEmail: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Analytics
  views: {
    type: Number,
    default: 0
  },

  clicks: {
    type: Number,
    default: 0
  },

  calls: {
    type: Number,
    default: 0
  },

  messages: [{
    sender: {
      name: String,
      email: String,
      phone: String
    },
    message: String,
    date: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],

  // Verification
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Social media
  socialMedia: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String,
    whatsapp: String
  },

  // Business hours
  businessHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },

  // Images
  images: {
    logo: String,
    banner: String,
    gallery: [String]
  },

  // Tags for search
  tags: [String],

  // Featured status
  featured: {
    type: Boolean,
    default: false
  },

  featuredUntil: Date,

  // SEO
  slug: {
    type: String,
    unique: true
  },

  meta: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
businessSchema.virtual('fullName').get(function() {
  return `${this.owner.firstName} ${this.owner.lastName}`;
});

businessSchema.virtual('totalReviews').get(function() {
  return this.reviews.length;
});

businessSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / this.reviews.length).toFixed(1);
});

// Indexes for better search performance
businessSchema.index({ businessName: 'text', description: 'text', 'owner.firstName': 'text', 'owner.lastName': 'text' });
businessSchema.index({ category: 1, country: 1 });
businessSchema.index({ verified: 1, status: 1 });
businessSchema.index({ rating: -1 });
businessSchema.index({ createdAt: -1 });
businessSchema.index({ 'location.city': 1 });

// Pre-save middleware
businessSchema.pre('save', async function(next) {
  // Generate slug from business name
  if (this.isModified('businessName')) {
    this.slug = this.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }

  // Generate tags from business info
  if (this.isModified('businessName') || this.isModified('description') || this.isModified('category')) {
    this.tags = [
      this.businessName.toLowerCase(),
      this.category,
      this.country,
      ...(this.description ? this.description.toLowerCase().split(' ').filter(word => word.length > 3) : [])
    ];
  }

  next();
});

// Instance methods
businessSchema.methods.generateVerificationToken = function() {
  this.verificationToken = uuidv4();
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return this.verificationToken;
};

businessSchema.methods.generatePasswordResetToken = function() {
  this.passwordResetToken = uuidv4();
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return this.passwordResetToken;
};

businessSchema.methods.verifyEmail = function() {
  this.verified = true;
  this.verificationToken = undefined;
  this.verificationExpires = undefined;
  this.status = 'active';
};

businessSchema.methods.addReview = function(reviewData) {
  this.reviews.push(reviewData);
  
  // Update average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating = (totalRating / this.reviews.length).toFixed(1);
  
  return this.save();
};

businessSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

businessSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  return this.save();
};

businessSchema.methods.updatePlan = function(plan, subscriptionData) {
  this.plan = plan;
  if (subscriptionData) {
    this.subscription = {
      ...this.subscription,
      ...subscriptionData
    };
  }
  return this.save();
};

// Static methods
businessSchema.statics.findByCategory = function(category, country) {
  const query = { category, verified: true, status: 'active' };
  if (country) query.country = country.toLowerCase();
  return this.find(query).sort({ rating: -1 });
};

businessSchema.statics.searchBusinesses = function(searchTerm, filters = {}) {
  const query = {
    $and: [
      { verified: true, status: 'active' },
      {
        $or: [
          { businessName: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  };

  if (filters.country) query.$and.push({ country: filters.country.toLowerCase() });
  if (filters.category) query.$and.push({ category: filters.category });

  return this.find(query.$and.length > 1 ? query : query.$and[1])
    .sort({ rating: -1, views: -1 });
};

businessSchema.statics.getFeaturedBusinesses = function(country, limit = 10) {
  const query = {
    featured: true,
    verified: true,
    status: 'active',
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: { $gt: new Date() } }
    ]
  };

  if (country) query.country = country.toLowerCase();

  return this.find(query)
    .sort({ rating: -1 })
    .limit(limit);
};

businessSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalBusinesses: { $sum: 1 },
        verifiedBusinesses: { $sum: { $cond: ['$verified', 1, 0] } },
        activeBusinesses: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        averageRating: { $avg: '$rating' },
        totalViews: { $sum: '$views' },
        totalReviews: { $sum: { $size: '$reviews' } }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);
};

// Validation methods
businessSchema.methods.isValidEmail = function(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

businessSchema.methods.isValidPhone = function(phone) {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

module.exports = mongoose.model('Business', businessSchema);
