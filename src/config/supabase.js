import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://edzfpxlzoyhaapnrhjxg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemZweGx6b3loYWFwbnJoanhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTE5ODQsImV4cCI6MjA2MDkyNzk4NH0.8qhofugD4rFVaLsSElwc3sqVZ522Lz1wZHmMQttUFCg';

// Create Supabase client with CORS-friendly configuration
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('connected_phones').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error: error.message };
  }
};

// Fallback storage for when Supabase is not available
export const fallbackStorage = {
  getPhones: () => {
    try {
      const phones = localStorage.getItem('fallback_connected_phones');
      return phones ? JSON.parse(phones) : [];
    } catch (error) {
      console.error('Error reading from fallback storage:', error);
      return [];
    }
  },
  
  savePhones: (phones) => {
    try {
      localStorage.setItem('fallback_connected_phones', JSON.stringify(phones));
      return true;
    } catch (error) {
      console.error('Error saving to fallback storage:', error);
      return false;
    }
  },
  
  addPhone: (phone) => {
    const phones = fallbackStorage.getPhones();
    const newPhones = [phone, ...phones];
    return fallbackStorage.savePhones(newPhones);
  },
  
  updatePhone: (phoneId, updates) => {
    const phones = fallbackStorage.getPhones();
    const updatedPhones = phones.map(phone => 
      phone.id === phoneId ? { ...phone, ...updates } : phone
    );
    return fallbackStorage.savePhones(updatedPhones);
  },
  
  deletePhone: (phoneId) => {
    const phones = fallbackStorage.getPhones();
    const filteredPhones = phones.filter(phone => phone.id !== phoneId);
    return fallbackStorage.savePhones(filteredPhones);
  }
};

export default supabase;