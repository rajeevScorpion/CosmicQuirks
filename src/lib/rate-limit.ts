import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isRateLimited(
    identifier: string, 
    windowMs: number, 
    maxRequests: number
  ): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this identifier
    const userRequests = this.requests.get(identifier) || [];
    
    // Filter out old requests outside the window
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return true;
    }
    
    // Add current request and update map
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return false;
  }
  
  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > now - oneHour);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Clean up old entries every 10 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  identifier?: (request: NextRequest) => string; // Custom identifier function
}

export const checkRateLimit = (
  request: NextRequest,
  config: RateLimitConfig
): { success: boolean; identifier: string; remaining?: number } => {
  // Skip rate limiting in development or if explicitly disabled
  if (process.env.SKIP_RATE_LIMITS === 'true' || process.env.NODE_ENV === 'development') {
    return { success: true, identifier: 'dev' };
  }

  // Get identifier (IP address by default, or custom function)
  const identifier = config.identifier ? 
    config.identifier(request) : 
    getClientIP(request);

  // Check rate limit
  const isLimited = rateLimiter.isRateLimited(
    identifier,
    config.windowMs,
    config.maxRequests
  );

  return {
    success: !isLimited,
    identifier,
  };
};

// Get client IP address from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || request.ip || 'unknown';
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // API endpoints
  prediction: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 requests per minute
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 auth attempts per 15 minutes
  },
  
  // General API
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
} as const;

// Helper function to create rate limit response
export const createRateLimitResponse = (identifier: string) => {
  return new Response(
    JSON.stringify({
      error: 'Too many cosmic requests',
      message: 'The mystical energies are overwhelmed! Please slow down and try again in a moment.',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Identifier': identifier,
        'Retry-After': '60', // Retry after 60 seconds
      },
    }
  );
};