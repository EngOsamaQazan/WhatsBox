const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const pino = require('pino');

// إنشاء logger مع مستوى تفصيلي أكثر
const logger = pino({ 
  level: 'info'
});

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
  logger.info(`بدء إنشاء عميل WhatsApp للهاتف: ${phoneId}`);
  
  const sessionDir = path.join(SESSIONS_DIR, phoneId);
  
  if (!fs.existsSync(sessionDir)) {
    logger.info(`إنشاء مجلد الجلسة: ${sessionDir}`);
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  logger.info(`إنشاء عميل WhatsApp للهاتف: ${phoneId}`);
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: phoneId,
      dataPath: sessionDir
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });
  
  logger.info(`إعداد معالجات الأحداث للهاتف: ${phoneId}`);
  
  // معالج رمز QR
  client.on('qr', async (qr) => {
    logger.info(`تم استلام رمز QR للهاتف ${phoneId}`);
    logger.debug(`محتوى رمز QR: ${qr.substring(0, 50)}...`);
    
    await updateQRCodeInDB(phoneId, qr);
    io.emit('qr', { phoneId, qr });
    logger.info(`تم إرسال رمز QR إلى العميل للهاتف: ${phoneId}`);
  });
  
  // معالج الاستعداد
  client.on('ready', async () => {
    logger.info(`تم ربط الهاتف ${phoneId} بنجاح`);
    await updatePhoneStatusInDB(phoneId, 'active');
    io.emit('ready', { phoneId });
  });
  
  // معالج قطع الاتصال
  client.on('disconnected', async (reason) => {
    logger.warn(`تم قطع الاتصال للهاتف ${phoneId}. السبب: ${reason}`);
    await updatePhoneStatusInDB(phoneId, 'inactive');
    io.emit('disconnected', { phoneId, reason });
    delete activeClients[phoneId];
  });
  
  // معالج فشل المصادقة
  client.on('auth_failure', async (msg) => {
    logger.error(`فشل المصادقة للهاتف ${phoneId}: ${msg}`);
    await updatePhoneStatusInDB(phoneId, 'inactive');
    io.emit('auth_failure', { phoneId, message: msg });
    delete activeClients[phoneId];
  });
  
  // تهيئة العميل
  logger.info(`تهيئة عميل WhatsApp للهاتف: ${phoneId}`);
  client.initialize();
  
  return client;
}

// معالجة اتصالات Socket.io
io.on('connection', (socket) => {
  logger.info(`عميل جديد متصل: ${socket.id}`);

  socket.on('connect_whatsapp', async (data) => {
    const { phoneId, phoneNumber, phoneName } = data;
    
    try {
      logger.info(`طلب ربط WhatsApp للهاتف ${phoneId}`, { phoneNumber, phoneName });
      
      if (activeClients[phoneId]) {
        logger.warn(`العميل موجود بالفعل للهاتف ${phoneId}`);
        socket.emit('whatsapp_status', { 
          phoneId, 
          status: 'already_initialized',
          message: 'WhatsApp client is already running for this phone' 
        });
        
        return;
      }
      
      // إرسال إشعار بدء التهيئة
      logger.info(`بدء تهيئة WhatsApp للهاتف ${phoneId}`);
      socket.emit('whatsapp_initializing', { phoneId, status: 'initializing' });
      
      // حفظ بيانات الهاتف في قاعدة البيانات
      logger.info(`حفظ بيانات الهاتف ${phoneId} في قاعدة البيانات`);
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
      logger.info(`بدء توليد رمز QR للهاتف ${phoneId}`);
      socket.emit('qr_generating', { phoneId });
      
      const client = await createWhatsAppClient(phoneId);
      activeClients[phoneId] = client;
      
      logger.info(`تم إنشاء وحفظ عميل WhatsApp للهاتف ${phoneId}`);
      
    } catch (error) {
      logger.error(`خطأ في ربط WhatsApp للهاتف ${phoneId}:`, error);
      socket.emit('whatsapp_error', { 
        phoneId, 
        error: error.message 
      });
    }
  });
  
  socket.on('send_message', async ({ phoneId, to, message, messageId }) => {
    try {
      logger.info(`إرسال رسالة من الهاتف ${phoneId} إلى ${to}`);
      
      if (!activeClients[phoneId]) {
        throw new Error(`No active client found for phone ${phoneId}`);
      }
      
      const client = activeClients[phoneId];
      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      
      await client.sendMessage(formattedNumber, message);
      
      socket.emit('message_sent', { phoneId, messageId });
    } catch (error) {
      logger.error(`خطأ في إرسال رسالة من الهاتف ${phoneId}:`, error);
      socket.emit('message_failed', { phoneId, messageId, error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`تم قطع اتصال العميل: ${socket.id}`);
  });
});

// تشغيل الخادم
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`الخادم يعمل على المنفذ ${PORT}`);
  logger.info(`مجلد الجلسات: ${SESSIONS_DIR}`);
  logger.info(`عدد العملاء النشطين: ${Object.keys(activeClients).length}`);
});
