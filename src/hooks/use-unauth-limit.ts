'use client';

import { useState, useEffect } from 'react';

interface UnauthLimit {
  used: number;
  limit: number;
  canGenerate: boolean;
  resetTime: Date;
}

const STORAGE_KEY = 'cosmic-quirks-unauth-usage';

export function useUnauthLimit() {
  const [limitInfo, setLimitInfo] = useState<UnauthLimit>({
    used: 0,
    limit: parseInt(process.env.NEXT_PUBLIC_UNAUTH_RESULT_LIMIT || '100', 10),
    canGenerate: true,
    resetTime: getNextMidnight(),
  });

  useEffect(() => {
    checkAndUpdateLimit();
  }, []);

  const checkAndUpdateLimit = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const limit = parseInt(process.env.NEXT_PUBLIC_UNAUTH_RESULT_LIMIT || '100', 10);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        
        if (data.date === today) {
          setLimitInfo({
            used: data.used || 0,
            limit,
            canGenerate: (data.used || 0) < limit,
            resetTime: getNextMidnight(),
          });
          return;
        }
      } catch (error) {
        console.error('Error parsing stored limit data:', error);
      }
    }

    // Reset or initialize
    const newData = {
      date: new Date().toDateString(),
      used: 0,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    setLimitInfo({
      used: 0,
      limit,
      canGenerate: true,
      resetTime: getNextMidnight(),
    });
  };

  const incrementUsage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const limit = parseInt(process.env.NEXT_PUBLIC_UNAUTH_RESULT_LIMIT || '100', 10);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        
        if (data.date === today) {
          const newUsed = (data.used || 0) + 1;
          const newData = { ...data, used: newUsed };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          
          setLimitInfo({
            used: newUsed,
            limit,
            canGenerate: newUsed < limit,
            resetTime: getNextMidnight(),
          });
          return;
        }
      } catch (error) {
        console.error('Error updating limit data:', error);
      }
    }
    
    // Fallback - should not happen if checkAndUpdateLimit was called first
    checkAndUpdateLimit();
  };

  return {
    ...limitInfo,
    incrementUsage,
    checkAndUpdateLimit,
  };
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}