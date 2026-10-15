import { createClient } from '@supabase/supabase-js';
const configuredUrl = (import.meta.env.VITE_SUPABASE_PROJECT_URL || import.meta.env.VITE_SUPABASE_URL || '').trim();
const url = configuredUrl ? new URL(configuredUrl).origin : '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key && !url.includes('YOUR_PROJECT') ? createClient(url, key.trim()) : null;
