import { createClient } from '@supabase/supabase-js';
const configuredUrl = (import.meta.env.VITE_SUPABASE_PROJECT_URL || import.meta.env.VITE_SUPABASE_URL || '').trim();
const url = configuredUrl ? new URL(configuredUrl).origin : '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key && !url.includes('YOUR_PROJECT') ? createClient(url, key.trim()) : null;

// The settings endpoint exposes enabled providers; it never returns provider secrets.
export async function getPublicAuthSettings(){
 if(!supabase)return null;
 const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key.trim()},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Unable to load sign-in methods.');
 return response.json();
}
