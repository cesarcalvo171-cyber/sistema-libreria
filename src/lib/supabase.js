import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('POS_SUPABASE_URL') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('POS_SUPABASE_ANON_KEY') || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
    (localStorage.getItem('POS_SUPABASE_URL') && localStorage.getItem('POS_SUPABASE_ANON_KEY'))
  );
};

export const getSupabaseConfig = () => {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('POS_SUPABASE_URL') || '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('POS_SUPABASE_ANON_KEY') || ''
  };
};

export const setSupabaseConfig = (url, key) => {
  if (url && key) {
    localStorage.setItem('POS_SUPABASE_URL', url.trim());
    localStorage.setItem('POS_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
