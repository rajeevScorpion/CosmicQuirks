'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { User as DBUser } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  dbUser: DBUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchDbUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setDbUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setDbUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchDbUser(currentUser.id);
      } else {
        setDbUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setDbUser(null);
    }
  };

  useEffect(() => {
    // Set mounted flag
    setMounted(true);
    let initialTimeout: NodeJS.Timeout;

    // Get initial session with better error handling and timeout
    const getSession = async () => {
      try {
        // Add a race condition between auth check and timeout
        const authPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        
        const { data: { session }, error } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchDbUser(session.user.id);
        }
      } catch (error) {
        // Auth timeout or other error - just proceed without auth
        setUser(null);
        setDbUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set shorter fallback timeout
    initialTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);

    getSession().finally(() => {
      clearTimeout(initialTimeout);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchDbUser(session.user.id);
          } else {
            setDbUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(initialTimeout);
    };
  }, []);

  // Prevent hydration mismatch by not rendering auth-dependent content until mounted
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    dbUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};