const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

// إنشاء تطبيق Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());

// إعداد Supabase
const supabaseUrl = 'https://edzfpxlzoyhaapnrhjxg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemZweGx6b3loYWFwbnJoanhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTM1MTk4NCwiZXhwIjoyMDYwOTI3OTg0fQ.egv9ihDi0ZRf5HqDU45KUNEbex3PlLCe5_asZpRLKpA';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// مجلد لتخزين بيانات جلسات WhatsApp
const SESSIONS_DIR = path.join(__dirname, 'auth_sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// قائمة لتخزين جلسات WhatsApp النشطة
const activeClients = {};

// وظيفة لتحديث بيانات QR في Supabase
async function updateQRCodeInDB(phoneId, qrCode) {
  try {
    const { data, error } = await supabase
      .from('connected_phones')
      .update({ qr_code: qrCode })
      .eq('id', phoneId)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating QR code in DB:', error);
  }
}

// وظيفة لتحديث حالة الهاتف في Supabase
async function updatePhoneStatusInDB(phoneId, status, sessionData = null) {
  try {
    const updateData = { 
      status, 
      last_activity: new Date().toISOString()
    };
    
    if (sessionData) {
      updateData.session_data = sessionData;
    }
    
    if (status === 'active') {
      updateData.last_connected = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('connected_phones')
      .update(updateData)
      .eq('id', phoneId)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating phone status in DB:', error);
  }
}

// إنشاء عميل WhatsApp جديد
async function createWhatsAppClient(phoneId) {
  const sessionDir = path.join(SESSIONS_DIR, phoneId);
  
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: pino({ level: 'warn' })
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log(`QR Code received for phone ${phoneId}`);
      await updateQRCodeInDB(phoneId, qr);
      io.emit('qr', { phoneId, qr });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed for ${phoneId}. Reconnecting: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        await updatePhoneStatusInDB(phoneId, 'reconnecting');
        io.emit('reconnecting', { phoneId });
        
        delete activeClients[phoneId];
        createWhatsAppClient(phoneId);
      } else {
        await updatePhoneStatusInDB(phoneId, 'inactive');
        io.emit('disconnected', { phoneId, reason: 'logged out' });
        
        delete activeClients[phoneId];
      }
    }
    
    if (connection === 'open') {
      console.log(`Phone ${phoneId} connected successfully`);
      await updatePhoneStatusInDB(phoneId, 'active');
      io.emit('ready', { phoneId });
    }
  });
  
  return sock;
}

// معالجة اتصالات Socket.io
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('connect_whatsapp', async (data) => {
    const { phoneId, phoneNumber, phoneName } = data;
    
    try {
      console.log(`Request to connect WhatsApp for phone ${phoneId}`);
      
      if (activeClients[phoneId]) {
        console.log(`Client already exists for phone ${phoneId}`);
        socket.emit('whatsapp_status', { 
          phoneId, 
          status: 'already_initialized',
          message: 'WhatsApp client is already running for this phone' 
        });
        
        // إرسال رمز QR إذا كان متوفراً
        setTimeout(() => {
          socket.emit('qr_generating', { phoneId });
          // محاكاة توليد رمز QR جديد
          const mockQR = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=mock-qr-${phoneId}-${Date.now()}`;
          setTimeout(() => {
            socket.emit('qr', { phoneId, qr: mockQR });
          }, 2000);
        }, 1000);
        
        return;
      }
      
      // إرسال إشعار بدء التهيئة
      socket.emit('whatsapp_initializing', { phoneId, status: 'initializing' });
      
      await supabase
        .from('connected_phones')
        .upsert({
          id: phoneId,
          phone_number: phoneNumber,
          phone_name: phoneName || phoneNumber,
          connection_type: 'qr',
          status: 'pending',
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        });
      
      // إرسال إشعار بدء توليد رمز QR
      socket.emit('qr_generating', { phoneId });
      
      const client = await createWhatsAppClient(phoneId);
      activeClients[phoneId] = client;
      
    } catch (error) {
      console.error(`Error connecting WhatsApp for phone ${phoneId}:`, error);
      socket.emit('whatsapp_error', { 
        phoneId, 
        error: error.message 
      });
    }
  });
  
  socket.on('send_message', async ({ phoneId, to, message, messageId }) => {
    try {
      console.log(`Sending message from phone ${phoneId} to ${to}`);
      
      if (!activeClients[phoneId]) {
        throw new Error(`No active client found for phone ${phoneId}`);
      }
      
      const formattedNumber = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
      
      await activeClients[phoneId].sendMessage(formattedNumber, { text: message });
      
      socket.emit('message_sent', { phoneId, messageId });
    } catch (error) {
      console.error(`Error sending message from phone ${phoneId}:`, error);
      socket.emit('message_failed', { phoneId, messageId, error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// تشغيل الخادم
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
