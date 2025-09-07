import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\n\nCheck your Supabase project\'s API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api');
  }
  
  return createBrowserClient(url, key);
};

// Browser client singleton for client components - created lazily
let _supabase: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in browser environment');
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase;
};

// Legacy export - will only work in browser with better error handling
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    try {
      const client = getSupabase();
      const value = (client as any)[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    } catch (error) {
      console.error('Supabase client error:', error);
      // Return a no-op function to prevent crashes
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOAuth: async () => ({ error: new Error('Supabase client not available') }),
          signInWithPassword: async () => ({ error: new Error('Supabase client not available') }),
          signUp: async () => ({ error: new Error('Supabase client not available') }),
          signOut: async () => ({ error: new Error('Supabase client not available') })
        };
      }
      return () => Promise.resolve({ data: null, error: new Error('Supabase client not available') });
    }
  }
});