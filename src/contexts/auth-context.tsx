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

export function AuthProvider({ 
  children, 
  initialSession = null 
}: { 
  children: React.ReactNode;
  initialSession?: any;
}) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(!initialSession);
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

    // Initialize auth state, using server session if available
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state...', initialSession ? 'with server session' : 'client-only');
        
        if (initialSession) {
          // Use server session for immediate hydration
          console.log('[Auth] Using server session');
          setUser(initialSession.user);
          if (initialSession.user) {
            await fetchDbUser(initialSession.user.id);
          }
          setLoading(false);
        } else {
          // Fallback to client session fetch
          console.log('[Auth] Fetching client session');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[Auth] Session fetch error:', error);
            setUser(null);
            setDbUser(null);
          } else {
            console.log('[Auth] Session fetched:', session ? 'authenticated' : 'anonymous');
            setUser(session?.user ?? null);
            
            if (session?.user) {
              await fetchDbUser(session.user.id);
            } else {
              setDbUser(null);
            }
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        setUser(null);
        setDbUser(null);
        setLoading(false);
      } finally {
        console.log('[Auth] Initialization complete');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session ? 'authenticated' : 'anonymous');
        
        try {
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchDbUser(session.user.id);
          } else {
            setDbUser(null);
          }
        } catch (error) {
          console.error('[Auth] State change error:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
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