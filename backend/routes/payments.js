const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const mobileMoneyService = require('../services/mobileMoney');

const router = express.Router();

// Initiate mobile money payment
router.post('/initiate', [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
  body('provider').isIn(['mtn', 'vodafone', 'orange', 'mpesa']).withMessage('Invalid provider'),
  body('reference').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ min: 1, max: 200 }),
  body('customerName').trim().isLength({ min: 2, max: 100 }).withMessage('Customer name required'),
  body('businessId').isMongoId().withMessage('Valid business ID required')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      amount,
      phoneNumber,
      provider,
      reference,
      description,
      customerName,
      businessId
    } = req.body;

    // Validate amount for provider
    const amountValidation = mobileMoneyService.validateAmount(amount, provider);
    if (!amountValidation.valid) {
      return res.status(400).json({ error: amountValidation.error });
    }

    // Format phone number
    const formattedPhone = mobileMoneyService.formatPhoneNumber(phoneNumber, provider);

    // Initiate payment
    const result = await mobileMoneyService.initiatePayment({
      amount,
      phoneNumber: formattedPhone,
      provider,
      reference: reference || `PAY-${Date.now()}`,
      description: description || 'Payment for services',
      customerName,
      businessId,
      userId: req.user.id,
      callbackUrl: `${process.env.BASE_URL}/api/payments/callback`
    });

    if (result.success) {
      res.status(201).json({
        message: 'Payment initiated successfully',
        transactionId: result.transactionId,
        provider: mobileMoneyService.providers[provider].name,
        amount,
        currency: mobileMoneyService.providers[provider].currency,
        phoneNumber: formattedPhone,
        customerName,
        status: 'pending',
        nextSteps: [
          'Check your phone for payment prompt',
          'Enter your PIN to confirm',
          'Wait for payment confirmation'
        ]
      });
    } else {
      res.status(400).json({
        error: 'Payment initiation failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Check payment status
router.get('/status/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({ error: 'Provider parameter required' });
    }

    const result = await mobileMoneyService.checkPaymentStatus(transactionId, provider);

    if (result.success) {
      res.json({
        transactionId,
        provider,
        status: result.status,
        providerResponse: result.providerResponse,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        error: 'Failed to check payment status',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Payment callback (webhook)
router.post('/callback', async (req, res) => {
  try {
    const { provider } = req.query;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider parameter required' });
    }

    const result = await mobileMoneyService.processCallback(req.body, provider);

    if (result.success) {
      // TODO: Update database, send notifications, etc.
      console.log(`Payment callback processed for transaction ${result.transactionId}`);
      
      res.status(200).json({
        message: 'Callback processed successfully',
        transactionId: result.transactionId,
        status: result.status
      });
    } else {
      console.error('Callback processing failed:', result.error);
      res.status(400).json({
        error: 'Callback processing failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Refund payment
router.post('/refund', [
  body('transactionId').trim().isLength({ min: 1, max: 100 }).withMessage('Transaction ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Refund amount must be greater than 0'),
  body('reason').trim().isLength({ min: 1, max: 200 }).withMessage('Refund reason required'),
  body('provider').isIn(['mtn', 'vodafone', 'orange', 'mpesa']).withMessage('Invalid provider')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, amount, reason, provider } = req.body;

    // TODO: Verify user owns this transaction
    // TODO: Check if transaction can be refunded

    const result = await mobileMoneyService.refundPayment(transactionId, amount, reason, provider);

    if (result.success) {
      res.json({
        message: 'Refund initiated successfully',
        refundId: result.refundId,
        originalTransactionId: transactionId,
        refundAmount: amount,
        reason,
        provider,
        status: 'processing'
      });
    } else {
      res.status(400).json({
        error: 'Refund initiation failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Refund initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate refund' });
  }
});

// Get supported providers
router.get('/providers', (req, res) => {
  try {
    const providers = mobileMoneyService.getSupportedProviders();
    res.json({
      providers,
      total: providers.length
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Validate phone number
router.post('/validate-phone', [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
  body('provider').optional().isIn(['mtn', 'vodafone', 'orange', 'mpesa'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, provider } = req.body;

    // Auto-detect provider if not specified
    const detectedProvider = provider || mobileMoneyService.detectProvider(phoneNumber);

    if (!detectedProvider) {
      return res.status(400).json({
        valid: false,
        error: 'Could not detect mobile money provider from phone number',
        supportedProviders: mobileMoneyService.getSupportedProviders()
      });
    }

    const isValid = mobileMoneyService.validatePhoneNumber(phoneNumber, detectedProvider);
    const formattedPhone = mobileMoneyService.formatPhoneNumber(phoneNumber, detectedProvider);

    res.json({
      valid: isValid,
      provider: detectedProvider,
      providerName: mobileMoneyService.providers[detectedProvider].name,
      phoneNumber: formattedPhone,
      currency: mobileMoneyService.providers[detectedProvider].currency
    });

  } catch (error) {
    console.error('Phone validation error:', error);
    res.status(500).json({ error: 'Failed to validate phone number' });
  }
});

// Get payment history for user
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, provider } = req.query;

    // TODO: Implement database query for payment history
    // This would query your payments collection for the authenticated user
    
    const mockPayments = [
      {
        id: 'VM1234567890',
        amount: 70.00,
        currency: 'GHS',
        provider: 'mtn',
        providerName: 'MTN Mobile Money',
        status: 'completed',
        description: 'Standard plan subscription',
        createdAt: '2024-01-15T10:30:00Z',
        businessName: 'TechZone Ghana'
      },
      {
        id: 'VM1234567891',
        amount: 30.00,
        currency: 'GHS',
        provider: 'vodafone',
        providerName: 'Vodafone Cash',
        status: 'completed',
        description: 'Basic plan subscription',
        createdAt: '2024-01-10T14:20:00Z',
        businessName: 'Glow Beauty Hub'
      }
    ];

    // Apply filters
    let filteredPayments = mockPayments;
    if (status) {
      filteredPayments = filteredPayments.filter(p => p.status === status);
    }
    if (provider) {
      filteredPayments = filteredPayments.filter(p => p.provider === provider);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    res.json({
      payments: paginatedPayments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(filteredPayments.length / limit),
        total: filteredPayments.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get payment statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // TODO: Implement database query for payment statistics
    const mockStats = {
      totalPayments: 156,
      totalAmount: 12450.50,
      averageAmount: 79.81,
      successfulPayments: 148,
      failedPayments: 8,
      successRate: 94.87,
      providerBreakdown: {
        mtn: { count: 89, amount: 7123.25, successRate: 96.63 },
        vodafone: { count: 45, amount: 3567.75, successRate: 93.33 },
        orange: { count: 12, amount: 980.50, successRate: 91.67 },
        mpesa: { count: 10, amount: 779.00, successRate: 90.00 }
      },
      monthlyTrend: [
        { month: '2024-01', amount: 3450.00, count: 43 },
        { month: '2024-02', amount: 4120.50, count: 52 },
        { month: '2024-03', amount: 4880.00, count: 61 }
      ]
    };

    res.json(mockStats);

  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

module.exports = router;
