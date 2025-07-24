import React, { createContext, useContext, useReducer, useEffect } from 'react';
import supabase, { testSupabaseConnection, fallbackStorage } from '../config/supabase';

const MessageContext = createContext();

const initialState = {
  messages: [],
  connectedPhones: [],
  selectedPhone: null,
  isSupabaseAvailable: false,
  usingFallback: false,
  stats: {
    totalSent: 0,
    successful: 0,
    failed: 0,
    pending: 0
  }
};

// استرجاع البيانات من التخزين المحلي و Supabase
const loadFromLocalStorage = () => {
  try {
    const savedMessages = localStorage.getItem('whatsapp_messages');
    const state = savedMessages ? JSON.parse(savedMessages) : initialState;
    
    // سنقوم بجلب الأرقام المتصلة من Supabase في useEffect
    return state;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return initialState;
  }
};

const messageReducer = (state, action) => {
  let newState;
  
  switch (action.type) {
    case 'ADD_MESSAGES':
      newState = {
        ...state,
        messages: [...action.payload, ...state.messages]
      };
      break;
      
    case 'UPDATE_MESSAGE':
      newState = {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        )
      };
      break;
      
    case 'UPDATE_STATS':
      newState = {
        ...state,
        stats: action.payload
      };
      break;
      
    case 'CLEAR_MESSAGES':
      newState = {
        ...state,
        messages: [],
        stats: {
          totalSent: 0,
          successful: 0,
          failed: 0,
          pending: 0
        }
      };
      break;
      
    case 'SET_CONNECTED_PHONES':
      newState = {
        ...state,
        connectedPhones: action.payload
      };
      break;
      
    case 'ADD_CONNECTED_PHONE':
      newState = {
        ...state,
        connectedPhones: [action.payload, ...state.connectedPhones]
      };
      break;
      
    case 'UPDATE_CONNECTED_PHONE':
      newState = {
        ...state,
        connectedPhones: state.connectedPhones.map(phone => 
          phone.id === action.payload.id ? { ...phone, ...action.payload } : phone
        )
      };
      break;
      
    case 'REMOVE_CONNECTED_PHONE':
      newState = {
        ...state,
        connectedPhones: state.connectedPhones.filter(phone => phone.id !== action.payload)
      };
      break;
      
    case 'SELECT_PHONE':
      newState = {
        ...state,
        selectedPhone: action.payload
      };
      break;
      
    case 'SET_SUPABASE_STATUS':
      newState = {
        ...state,
        isSupabaseAvailable: action.payload.available,
        usingFallback: action.payload.usingFallback
      };
      break;
      
    default:
      return state;
  }
  
  // حفظ البيانات في التخزين المحلي
  localStorage.setItem('whatsapp_messages', JSON.stringify(newState));
  return newState;
};

export const MessageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(messageReducer, initialState, loadFromLocalStorage);
  
  // تحديث الإحصائيات عند تغيير الرسائل
  useEffect(() => {
    const stats = {
      totalSent: state.messages.length,
      successful: state.messages.filter(msg => msg.status === 'success').length,
      failed: state.messages.filter(msg => msg.status === 'failed').length,
      pending: state.messages.filter(msg => msg.status === 'pending').length
    };
    
    dispatch({ type: 'UPDATE_STATS', payload: stats });
  }, [state.messages]);
  
  // Test Supabase connection and load phones
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Test Supabase connection
        const connectionTest = await testSupabaseConnection();
        
        if (connectionTest.success) {
          // Supabase is available, fetch from there
          const { data, error } = await supabase
            .from('connected_phones')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          dispatch({ type: 'SET_CONNECTED_PHONES', payload: data });
          dispatch({ type: 'SET_SUPABASE_STATUS', payload: { available: true, usingFallback: false } });
          
          // Set up real-time subscription
          const phonesSubscription = supabase
            .channel('connected_phones_changes')
            .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'connected_phones' }, 
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  dispatch({ type: 'ADD_CONNECTED_PHONE', payload: payload.new });
                } else if (payload.eventType === 'UPDATE') {
                  dispatch({ type: 'UPDATE_CONNECTED_PHONE', payload: payload.new });
                } else if (payload.eventType === 'DELETE') {
                  dispatch({ type: 'REMOVE_CONNECTED_PHONE', payload: payload.old.id });
                }
              }
            )
            .subscribe();
          
          return () => {
            phonesSubscription.unsubscribe();
          };
        } else {
          throw new Error('Supabase connection failed');
        }
      } catch (error) {
        console.warn('Supabase not available, using fallback storage:', error);
        
        // Use fallback storage
        const fallbackPhones = fallbackStorage.getPhones();
        dispatch({ type: 'SET_CONNECTED_PHONES', payload: fallbackPhones });
        dispatch({ type: 'SET_SUPABASE_STATUS', payload: { available: false, usingFallback: true } });
      }
    };
    
    initializeData();
  }, []);
  
  return (
    <MessageContext.Provider value={{ state, dispatch }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};