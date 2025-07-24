import { createClient } from '@supabase/supabase-js';

// Use environment variables for better configuration management
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://edzfpxlzoyhaapnrhjxg.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemZweGx6b3loYWFwbnJoanhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTE5ODQsImV4cCI6MjA2MDkyNzk4NH0.8qhofugD4rFVaLsSElwc3sqVZ522Lz1wZHmMQttUFCg';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

export default supabase;