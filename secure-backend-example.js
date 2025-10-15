// Secure Backend Server for VU Education Lab AI Assistant
// This file shows the complete secure implementation

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const app = express();

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit request size
app.use(cors({
  origin: function(origin, callback) {
    // Allow Chrome extension origins
    if (!origin || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      callback(null, true);
    } else {
      callback(null, true); // For now allow all, you can restrict later
    }
  }
}));

// Cache for storing user request counts
const userCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

// Configuration
const ALLOWED_EXTENSION_IDS = [
  'fhfbfnfoohflcpojakdooklinaaneade' // Your extension ID - UPDATE THIS!
];

const ALLOWED_DOMAINS = ['vu.nl', 'student.vu.nl'];

// Gemini API configuration (from environment variables)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Cost tracking
let dailyCost = 0;
const DAILY_COST_LIMIT = 50; // $50 per day

// Helper: Check if email is from VU domain
function isVUEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith('@' + domain));
}

// Helper: Verify Google OAuth token
async function verifyGoogleToken(token) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Middleware: Authentication
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const userEmail = req.headers['x-user-email'];
    const extensionId = req.headers['x-extension-id'];
    
    // Check extension ID
    if (!ALLOWED_EXTENSION_IDS.includes(extensionId)) {
      return res.status(403).json({ 
        error: 'Invalid extension ID',
        message: 'This request is not from an authorized extension'
      });
    }
    
    // Check authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No authorization token',
        message: 'Please sign in to use this service'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    // Verify token with Google
    const userInfo = await verifyGoogleToken(token);
    
    if (!userInfo) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication failed. Please sign in again.'
      });
    }
    
    // Verify email matches
    if (userInfo.email !== userEmail) {
      return res.status(403).json({ 
        error: 'Email mismatch',
        message: 'Token email does not match provided email'
      });
    }
    
    // Verify VU email
    if (!isVUEmail(userInfo.email)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only VU Amsterdam email addresses are allowed'
      });
    }
    
    // Attach user info to request
    req.user = userInfo;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

// Middleware: Rate limiting per user
function userRateLimit(req, res, next) {
  const userEmail = req.user?.email;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  const cacheKey = `rate_${userEmail}`;
  const userData = userCache.get(cacheKey) || { count: 0, resetTime: Date.now() + 3600000 };
  
  // Reset counter if time has passed
  if (Date.now() > userData.resetTime) {
    userData.count = 0;
    userData.resetTime = Date.now() + 3600000;
  }
  
  // Check limit (50 requests per hour per user)
  if (userData.count >= 50) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: 'You have exceeded the maximum number of requests per hour (50). Please try again later.',
      resetTime: new Date(userData.resetTime).toISOString()
    });
  }
  
  // Increment counter
  userData.count++;
  userCache.set(cacheKey, userData);
  
  console.log(`User ${userEmail}: ${userData.count}/50 requests this hour`);
  
  next();
}

// Global IP-based rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dailyCost: dailyCost.toFixed(2),
    dailyLimit: DAILY_COST_LIMIT
  });
});

// Validate endpoint (requires auth)
app.get('/api/validate', authenticate, (req, res) => {
  res.json({ 
    valid: true,
    user: {
      email: req.user.email,
      name: req.user.name
    }
  });
});

// Generate content endpoint (requires auth + rate limiting)
app.post('/api/generate', authenticate, userRateLimit, async (req, res) => {
  try {
    const { prompt, systemPrompt, feature } = req.body;
    
    // Check daily cost limit
    if (dailyCost >= DAILY_COST_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily cost limit reached',
        message: 'The service has reached its daily cost limit. Please try again tomorrow.'
      });
    }
    
    // Validate input
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Log request
    console.log({
      timestamp: new Date().toISOString(),
      user: req.user.email,
      feature: feature,
      promptLength: prompt.length
    });
    
    // Call Gemini API
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Gemini API key is not set on the server'
      });
    }
    
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });
    
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({ 
        error: 'AI generation failed',
        message: 'Failed to generate content'
      });
    }
    
    const geminiData = await geminiResponse.json();
    const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated';
    
    // Estimate cost (very rough estimate - adjust based on actual pricing)
    const estimatedCost = (prompt.length + generatedContent.length) * 0.00001;
    dailyCost += estimatedCost;
    
    console.log(`Daily cost: $${dailyCost.toFixed(4)} / $${DAILY_COST_LIMIT}`);
    
    res.json({ 
      content: generatedContent,
      user: req.user.email,
      feature: feature
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      message: error.message
    });
  }
});

// Reset daily cost at midnight
const resetDailyCost = () => {
  dailyCost = 0;
  console.log('Daily cost counter reset');
};

const msUntilMidnight = new Date().setHours(24, 0, 0, 0) - Date.now();
setTimeout(() => {
  resetDailyCost();
  setInterval(resetDailyCost, 24 * 60 * 60 * 1000);
}, msUntilMidnight);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Secure server running on port ${PORT}`);
  console.log(`🔒 Authentication: Enabled`);
  console.log(`⏱️  Rate limiting: 50 requests/hour per user, 100 requests/15min per IP`);
  console.log(`💰 Daily cost limit: $${DAILY_COST_LIMIT}`);
  console.log(`🎯 Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`);
});

