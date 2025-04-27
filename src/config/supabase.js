import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edzfpxlzoyhaapnrhjxg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemZweGx6b3loYWFwbnJoanhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTE5ODQsImV4cCI6MjA2MDkyNzk4NH0.8qhofugD4rFVaLsSElwc3sqVZ522Lz1wZHmMQttUFCg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;