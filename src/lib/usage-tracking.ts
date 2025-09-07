import { createServiceRoleClient } from '@/lib/supabase/server';
import type { User } from '@/lib/supabase/types';

// Environment configuration helpers
export const getLimits = () => ({
  unregistered: parseInt(process.env.NEXT_PUBLIC_UNAUTH_RESULT_LIMIT || process.env.UNREGISTERED_DAILY_LIMIT || '100', 10),
  registered: parseInt(process.env.REGISTERED_DAILY_LIMIT || '10', 10),
  premium: parseInt(process.env.PREMIUM_DAILY_LIMIT || '50', 10),
});

export const getAllowedForms = (userType: 'unregistered' | 'registered' | 'premium'): string[] => {
  const formConfig = {
    unregistered: process.env.UNREGISTERED_FORMS || 'fortune',
    registered: process.env.REGISTERED_FORMS || 'fortune,matchmaking,birthday,career,travel',
    premium: process.env.PREMIUM_FORMS || 'fortune,matchmaking,birthday,career,travel',
  };
  
  return formConfig[userType].split(',').map(f => f.trim()).filter(Boolean);
};

// Get client IP address from request headers
export const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddr || 'unknown';
};

// Check if user has reached their daily limit
export const checkUsageLimit = async (
  userOrIP: string, 
  isRegistered: boolean,
  planType?: 'registered' | 'premium'
): Promise<{ canGenerate: boolean; used: number; limit: number; message?: string }> => {
  const supabase = createServiceRoleClient();
  const limits = getLimits();
  const today = new Date().toISOString().split('T')[0];

  try {
    if (isRegistered) {
      // Check registered user limits
      const { data: user, error } = await supabase
        .from('users')
        .select('generations_used_today, last_generation_date, plan_type')
        .eq('id', userOrIP)
        .single();

      if (error) throw error;

      const userLimit = limits[user.plan_type as keyof typeof limits];
      const isToday = user.last_generation_date === today;
      const used = isToday ? user.generations_used_today : 0;
      
      const canGenerate = used < userLimit;
      
      return {
        canGenerate,
        used,
        limit: userLimit,
        message: canGenerate ? undefined : 'Your cosmic energy is recharging... Try again tomorrow when the stars align!'
      };
    } else {
      // Check unregistered user (IP-based) limits
      const { data: usage, error } = await supabase
        .from('usage_tracking')
        .select('generations_used')
        .eq('ip_address', userOrIP)
        .eq('date', today)
        .single();

      const used = usage?.generations_used || 0;
      const limit = limits.unregistered;
      const canGenerate = used < limit;

      return {
        canGenerate,
        used,
        limit,
        message: canGenerate ? undefined : 'The mystical forces are overwhelming! Sign up to unlock more cosmic wisdom, or return tomorrow.'
      };
    }
  } catch (error) {
    console.error('Error checking usage limit:', error);
    // On error, allow generation but with conservative limit
    return {
      canGenerate: true,
      used: 0,
      limit: isRegistered ? limits.registered : limits.unregistered,
    };
  }
};

// Increment usage counter
export const incrementUsage = async (
  userOrIP: string,
  isRegistered: boolean
): Promise<boolean> => {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    if (isRegistered) {
      // Update registered user usage
      const { error } = await supabase.rpc('increment_user_usage', {
        user_id: userOrIP,
        current_date: today,
      });

      if (error) throw error;
    } else {
      // Update unregistered user (IP-based) usage
      const { error } = await supabase.rpc('increment_ip_usage', {
        client_ip: userOrIP,
        current_date: today,
      });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return false;
  }
};

// Reset daily usage counters (called by cron job or background task)
export const resetDailyUsage = async (): Promise<void> => {
  const supabase = createServiceRoleClient();
  
  try {
    // Call the database function to reset daily usage
    const { error } = await supabase.rpc('reset_daily_usage');
    if (error) throw error;
    
    console.log('Daily usage counters reset successfully');
  } catch (error) {
    console.error('Error resetting daily usage:', error);
  }
};

// Check form access permission
export const checkFormAccess = (
  formType: string,
  userType: 'unregistered' | 'registered' | 'premium'
): boolean => {
  const allowedForms = getAllowedForms(userType);
  return allowedForms.includes(formType);
};

// Get usage statistics for user dashboard
export const getUserUsageStats = async (userId: string): Promise<{
  used: number;
  limit: number;
  resetTime: string;
  planType: 'registered' | 'premium';
} | null> => {
  const supabase = createServiceRoleClient();
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('generations_used_today, last_generation_date, plan_type')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const limits = getLimits();
    const today = new Date().toISOString().split('T')[0];
    const isToday = user.last_generation_date === today;
    const used = isToday ? user.generations_used_today : 0;
    
    // Calculate reset time (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    return {
      used,
      limit: limits[user.plan_type as keyof typeof limits],
      resetTime: tomorrow.toISOString(),
      planType: user.plan_type as 'registered' | 'premium',
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    return null;
  }
};