const axios = require('axios');
const crypto = require('crypto');

class MobileMoneyService {
  constructor() {
    this.providers = {
      mtn: {
        name: 'MTN Mobile Money',
        baseUrl: process.env.MTN_MOMO_BASE_URL || 'https://api.mtn.com',
        apiKey: process.env.MTN_MOMO_API_KEY,
        secret: process.env.MTN_MOMO_SECRET,
        currency: 'GHS'
      },
      vodafone: {
        name: 'Vodafone Cash',
        baseUrl: process.env.VODAFONE_CASH_BASE_URL || 'https://api.vodafone.com',
        apiKey: process.env.VODAFONE_CASH_API_KEY,
        secret: process.env.VODAFONE_CASH_SECRET,
        currency: 'GHS'
      },
      orange: {
        name: 'Orange Money',
        baseUrl: process.env.ORANGE_MONEY_BASE_URL || 'https://api.orange.com',
        apiKey: process.env.ORANGE_MONEY_API_KEY,
        secret: process.env.ORANGE_MONEY_SECRET,
        currency: 'XOF'
      },
      mpesa: {
        name: 'M-Pesa',
        baseUrl: process.env.MPESA_BASE_URL || 'https://api.safaricom.co.ke',
        apiKey: process.env.MPESA_API_KEY,
        secret: process.env.MPESA_SECRET,
        currency: 'KES'
      }
    };
  }

  // Generate signature for API requests
  generateSignature(data, secret) {
    const sortedData = Object.keys(data)
      .sort()
      .reduce((result, key) => {
        result[key] = data[key];
        return result;
      }, {});
    
    const stringToSign = Object.keys(sortedData)
      .map(key => `${key}=${sortedData[key]}`)
      .join('&');
    
    return crypto.createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex');
  }

  // Validate phone number for specific provider
  validatePhoneNumber(phoneNumber, provider) {
    const patterns = {
      mtn: /^(\+233|0)2[4567]\d{7}$/,
      vodafone: /^(\+233|0)20\d{8}$/,
      orange: /^(\+225|0)\d{10}$/,
      mpesa: /^(\+254|07)\d{8}$/
    };

    return patterns[provider] ? patterns[provider].test(phoneNumber) : false;
  }

  // Detect provider from phone number
  detectProvider(phoneNumber) {
    const cleanedNumber = phoneNumber.replace(/\s/g, '');
    
    if (cleanedNumber.startsWith('+233') || cleanedNumber.startsWith('0')) {
      const prefix = cleanedNumber.startsWith('+233') 
        ? cleanedNumber.substring(4, 6) 
        : cleanedNumber.substring(1, 3);
      
      switch (prefix) {
        case '24':
        case '25':
        case '26':
        case '27':
          return 'mtn';
        case '20':
          return 'vodafone';
        default:
          return null;
      }
    }
    
    if (cleanedNumber.startsWith('+254') || cleanedNumber.startsWith('07')) {
      return 'mpesa';
    }
    
    if (cleanedNumber.startsWith('+225') || cleanedNumber.startsWith('0')) {
      return 'orange';
    }
    
    return null;
  }

  // Initiate mobile money payment
  async initiatePayment(paymentData) {
    const {
      amount,
      phoneNumber,
      provider,
      reference,
      description,
      customerName,
      callbackUrl
    } = paymentData;

    // Validate provider
    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Validate phone number
    if (!this.validatePhoneNumber(phoneNumber, provider)) {
      throw new Error(`Invalid phone number for ${this.providers[provider].name}`);
    }

    const providerConfig = this.providers[provider];
    
    try {
      // Generate transaction ID
      const transactionId = `VM${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Prepare request data
      const requestData = {
        transactionId,
        amount: parseFloat(amount).toFixed(2),
        currency: providerConfig.currency,
        phoneNumber,
        customerName,
        description,
        reference,
        callbackUrl: callbackUrl || `${process.env.BASE_URL}/api/payments/callback`,
        timestamp: new Date().toISOString()
      };

      // Generate signature
      const signature = this.generateSignature(requestData, providerConfig.secret);

      // Make API request
      const response = await axios.post(
        `${providerConfig.baseUrl}/payments/initiate`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'X-Signature': signature,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Store transaction details
      const transaction = {
        id: transactionId,
        provider,
        amount: requestData.amount,
        currency: requestData.currency,
        phoneNumber,
        customerName,
        description,
        reference,
        status: 'pending',
        createdAt: new Date(),
        callbackUrl: requestData.callbackUrl,
        providerResponse: response.data
      };

      // TODO: Save to database
      console.log('Payment initiated:', transaction);

      return {
        success: true,
        transactionId,
        message: `Payment initiated via ${providerConfig.name}`,
        providerResponse: response.data,
        transaction
      };

    } catch (error) {
      console.error(`Payment initiation failed for ${provider}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        provider,
        amount,
        phoneNumber
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId, provider) {
    const providerConfig = this.providers[provider];
    
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      const response = await axios.get(
        `${providerConfig.baseUrl}/payments/${transactionId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        status: response.data.status,
        providerResponse: response.data
      };

    } catch (error) {
      console.error(`Status check failed for ${transactionId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        transactionId
      };
    }
  }

  // Process payment callback
  async processCallback(callbackData, provider) {
    try {
      const { transactionId, status, amount, phoneNumber } = callbackData;
      
      // Verify callback signature
      const providerConfig = this.providers[provider];
      const expectedSignature = this.generateSignature(callbackData, providerConfig.secret);
      
      if (callbackData.signature !== expectedSignature) {
        throw new Error('Invalid callback signature');
      }

      // TODO: Update transaction in database
      console.log(`Payment callback processed:`, {
        transactionId,
        provider,
        status,
        amount,
        phoneNumber
      });

      return {
        success: true,
        message: 'Callback processed successfully',
        transactionId,
        status
      };

    } catch (error) {
      console.error('Callback processing failed:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Refund payment
  async refundPayment(transactionId, amount, reason, provider) {
    const providerConfig = this.providers[provider];
    
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      const refundData = {
        originalTransactionId: transactionId,
        refundAmount: parseFloat(amount).toFixed(2),
        reason,
        timestamp: new Date().toISOString()
      };

      const signature = this.generateSignature(refundData, providerConfig.secret);

      const response = await axios.post(
        `${providerConfig.baseUrl}/payments/refund`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'X-Signature': signature,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        refundId: response.data.refundId,
        message: 'Refund initiated successfully',
        providerResponse: response.data
      };

    } catch (error) {
      console.error(`Refund failed for ${transactionId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        transactionId
      };
    }
  }

  // Get supported providers
  getSupportedProviders() {
    return Object.keys(this.providers).map(key => ({
      id: key,
      name: this.providers[key].name,
      currency: this.providers[key].currency
    }));
  }

  // Validate payment amount
  validateAmount(amount, provider) {
    const limits = {
      mtn: { min: 1, max: 10000 },
      vodafone: { min: 1, max: 5000 },
      orange: { min: 100, max: 500000 }, // XOF
      mpesa: { min: 10, max: 150000 } // KES
    };

    const providerLimits = limits[provider];
    if (!providerLimits) {
      return { valid: false, error: 'Unsupported provider' };
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < providerLimits.min || numAmount > providerLimits.max) {
      return {
        valid: false,
        error: `Amount must be between ${providerLimits.min} and ${providerLimits.max} ${this.providers[provider].currency}`
      };
    }

    return { valid: true };
  }

  // Format phone number
  formatPhoneNumber(phoneNumber, provider) {
    const cleanedNumber = phoneNumber.replace(/\s/g, '');
    
    if (cleanedNumber.startsWith('+')) {
      return cleanedNumber;
    }
    
    const prefixes = {
      mtn: '+233',
      vodafone: '+233',
      orange: '+225',
      mpesa: '+254'
    };
    
    const prefix = prefixes[provider];
    if (!prefix) {
      return cleanedNumber;
    }
    
    if (cleanedNumber.startsWith('0')) {
      return prefix + cleanedNumber.substring(1);
    }
    
    return cleanedNumber;
  }
}

module.exports = new MobileMoneyService();
