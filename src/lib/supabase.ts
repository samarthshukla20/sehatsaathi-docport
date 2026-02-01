import { createClient } from '@supabase/supabase-js';

// 1. Read variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Log them to Console (F12) for debugging
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseAnonKey ? "Loaded (Hidden)" : "MISSING");

// 3. Check and Initialize
if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
  console.error("🚨 CRITICAL ERROR: Invalid Supabase URL. Check your .env file!");
  throw new Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);