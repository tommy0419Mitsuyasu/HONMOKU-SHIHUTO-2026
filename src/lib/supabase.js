/**
 * Supabase client initialization
 * Falls back to demo mode when environment variables are not set
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemo = !supabaseUrl || !supabaseAnonKey;

export const supabase = isDemo
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
