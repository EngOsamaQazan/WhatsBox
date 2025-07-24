import { io } from 'socket.io-client';

class WhatsAppSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.qrTimeout = null;
    this.qrRetryAttempts = 0;
    this.maxQrRetryAttempts = 3;
    this.isQrGenerating = false;
    this.connectionStatus = 'disconnected';
    this.currentPhoneId = null;
  }

  // إنشاء الاتصال بالسوكت
  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5000', {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true
      });
      this.setupSocketListeners();
      this.reconnectAttempts = 0;
      this.connectionStatus = 'connecting';
    }
    return this.socket;
  }

  // معالجة إغلاق الاتصال
  disconnect() {
    if (this.socket) {
      // إلغاء أي مؤقتات نشطة
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      if (this.qrTimeout) {
        clearTimeout(this.qrTimeout);
        this.qrTimeout = null;
      }
      
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  // إعداد المستمعين للأحداث
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connectionStatus = 'connected';
      this.emit('socket_connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connectionStatus = 'disconnected';
      this.emit('socket_disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus = 'error';
      this.emit('socket_error', error);
      
      // محاولة إعادة الاتصال يدويًا إذا فشلت المحاولات التلقائية
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`محاولة إعادة الاتصال ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        
        this.reconnectTimeout = setTimeout(() => {
          if (this.socket) {
            this.socket.connect();
          } else {
            this.connect();
          }
        }, 2000);
        
        this.emit('reconnecting', { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts });
      } else {
        this.connectionStatus = 'failed';
        this.emit('max_reconnect_attempts', { message: 'تم الوصول إلى الحد الأقصى من محاولات إعادة الاتصال' });
      }
    });

    // أحداث WhatsApp
    this.socket.on('qr', (data) => {
      console.log('QR received:', data);
      
      // إلغاء أي مؤقت QR سابق
      if (this.qrTimeout) {
        clearTimeout(this.qrTimeout);
      }
      
      // إعادة تعيين عدد محاولات إعادة توليد QR عند استلام رمز جديد
      this.qrRetryAttempts = 0;
      this.isQrGenerating = false;
      
      // إعداد مؤقت لانتهاء صلاحية رمز QR (عادة ما تكون 60 ثانية)
      this.qrTimeout = setTimeout(() => {
        console.log('QR code timeout');
        this.emit('qr_timeout', { message: 'رمز QR انتهت صلاحيته، جاري إعادة المحاولة...' });
        
        // طلب رمز QR جديد من الخادم
        this.requestNewQR({ retry: true, timeout: true, phoneId: this.currentPhoneId });
      }, 55000); // 55 ثانية قبل انتهاء صلاحية رمز QR
      
      this.emit('qr_received', data);
    });
    
    // إضافة مستمع لحدث بدء توليد رمز QR
    this.socket.on('qr_generating', (data) => {
      console.log('QR generating:', data);
      this.isQrGenerating = true;
      this.emit('qr_generating', { message: 'جاري توليد رمز QR، يرجى الانتظار...' });
    });

    // إضافة مستمع لحدث عدم وجود عميل نشط
    this.socket.on('whatsapp_initializing', (data) => {
      console.log('WhatsApp initializing:', data);
      this.isQrGenerating = true;
      this.emit('whatsapp_initializing', data);
    });

    // إضافة مستمع لحدث حالة WhatsApp
    this.socket.on('whatsapp_status', (data) => {
      console.log('WhatsApp status:', data);
      
      if (data.status === 'already_initialized') {
        this.isQrGenerating = false;
        this.emit('whatsapp_already_initialized', data);
      } else {
        this.emit('whatsapp_status', data);
      }
    });
    this.socket.on('authenticated', (data) => {
      console.log('WhatsApp authenticated:', data);
      this.isQrGenerating = false;
      this.emit('whatsapp_authenticated', data);
    });

    this.socket.on('ready', (data) => {
      console.log('WhatsApp ready:', data);
      this.isQrGenerating = false;
      this.emit('whatsapp_ready', data);
    });

    this.socket.on('disconnected', (data) => {
      console.log('WhatsApp disconnected:', data);
      this.isQrGenerating = false;
      this.emit('whatsapp_disconnected', data);
    });

    this.socket.on('auth_failure', (data) => {
      console.error('WhatsApp auth failure:', data);
      this.isQrGenerating = false;
      this.emit('whatsapp_error', data);
    });

    this.socket.on('change_state', (data) => {
      console.log('WhatsApp state changed:', data);
      this.emit('whatsapp_state_changed', data);
    });

    this.socket.on('whatsapp_initializing', (data) => {
      console.log('WhatsApp initializing:', data);
      this.emit('whatsapp_initializing', data);
    });

    this.socket.on('whatsapp_status', (data) => {
      console.log('WhatsApp status:', data);
      this.emit('whatsapp_status', data);
    });

    this.socket.on('whatsapp_error', (data) => {
      console.error('WhatsApp error:', data);
      this.emit('whatsapp_error', data);
      
      // معالجة أخطاء محددة
      if (data && data.error && (data.error.includes('QR') || data.error.includes('timeout'))) {
        this.emit('qr_error', { message: 'حدث خطأ في رمز QR، جاري إعادة المحاولة...' });
        // طلب رمز QR جديد مع التحقق من عدد المحاولات
        this.requestNewQR({ error: data.error });
      }
    });
    
    // أحداث إضافية لتحسين تجربة المستخدم
    this.socket.on('loading_screen', (data) => {
      console.log('WhatsApp loading screen:', data);
      this.emit('whatsapp_loading', data);
    });
    
    this.socket.on('qr_timeout', (data) => {
      console.log('QR timeout:', data);
      this.emit('qr_timeout', data);
    });
    
    this.socket.on('connection_progress', (data) => {
      console.log('Connection progress:', data);
      this.emit('connection_progress', data);
    });

    this.socket.on('message_sent', (data) => {
      console.log('WhatsApp message sent:', data);
      this.emit('whatsapp_message_sent', data);
    });

    this.socket.on('message_failed', (data) => {
      console.error('WhatsApp message failed:', data);
      this.emit('whatsapp_message_failed', data);
    });
  }

  // إرسال حدث إلى الخادم
  sendToServer(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    } else {
      console.error('Socket not connected, cannot send event:', event);
      // محاولة إعادة الاتصال تلقائيًا
      this.tryReconnect();
      return false;
    }
  }

  // محاولة إعادة الاتصال بالخادم
  tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`محاولة إعادة الاتصال تلقائيًا ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        if (!this.socket) {
          this.connect();
        } else if (!this.socket.connected) {
          this.socket.connect();
        }
        
        // إذا نجحت إعادة الاتصال، نطلب رمز QR جديد
        if (this.socket && this.socket.connected) {
          this.sendToServer('request_new_qr', { reconnected: true });
          this.emit('reconnected', { attempt: this.reconnectAttempts });
          this.reconnectAttempts = 0;
        }
      }, 2000);
      
      this.emit('reconnecting', { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts });
      return true;
    } else {
      this.emit('max_reconnect_attempts', { message: 'تم الوصول إلى الحد الأقصى من محاولات إعادة الاتصال' });
      return false;
    }
  }
  
  // طلب رمز QR جديد من الخادم
  requestNewQR(options = { manual: true }) {
    console.log('طلب رمز QR جديد:', options);
    
    // حفظ معرف الهاتف الحالي
    if (options.phoneId) {
      this.currentPhoneId = options.phoneId;
    }
    
    // التحقق من حالة الاتصال بالسوكت
    if (this.connectionStatus !== 'connected') {
      console.log('السوكت غير متصل، محاولة إعادة الاتصال...');
      this.connect();
      
      // انتظار الاتصال ثم إعادة المحاولة
      setTimeout(() => {
        if (this.connectionStatus === 'connected') {
          this.requestNewQR(options);
        } else {
          this.emit('connection_failed', { message: 'فشل في الاتصال بالخادم' });
        }
      }, 3000);
      return false;
    }
    
    // إلغاء أي مؤقت QR سابق
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout);
      this.qrTimeout = null;
    }
    
    // التحقق من عدد محاولات إعادة توليد QR
    if (!options.manual && this.qrRetryAttempts >= this.maxQrRetryAttempts) {
      console.log(`تم الوصول إلى الحد الأقصى من محاولات توليد رمز QR (${this.maxQrRetryAttempts})`);
      this.emit('max_qr_retry_attempts', { 
        message: `تم الوصول إلى الحد الأقصى من محاولات توليد رمز QR (${this.maxQrRetryAttempts})، يرجى المحاولة يدويًا.`,
        maxAttempts: this.maxQrRetryAttempts,
        phoneId: options.phoneId || null
      });
      return false;
    }
    
    // تجنب طلبات متعددة متزامنة لتوليد رمز QR
    if (this.isQrGenerating && !options.manual) {
      console.log('جاري بالفعل توليد رمز QR، يرجى الانتظار...');
      return false;
    }
    
    // زيادة عدد المحاولات إذا لم تكن محاولة يدوية
    if (!options.manual) {
      this.qrRetryAttempts++;
    } else {
      // إعادة تعيين عدد المحاولات عند الطلب اليدوي
      this.qrRetryAttempts = 0;
    }
    
    this.isQrGenerating = true;
    
    // إرسال إشعار بطلب رمز QR جديد
    this.emit('requesting_new_qr', { 
      message: 'جاري طلب رمز QR جديد...', 
      attempt: this.qrRetryAttempts,
      maxAttempts: this.maxQrRetryAttempts,
      manual: options.manual || false,
      timeout: options.timeout || false,
      error: options.error || null,
      phoneId: options.phoneId || null
    });
    
    // إعداد مؤقت للتحقق من استجابة الخادم
    const responseTimeout = setTimeout(() => {
      if (this.isQrGenerating) {
        this.isQrGenerating = false;
        this.emit('qr_generation_timeout', { 
          message: 'انتهت مهلة انتظار توليد رمز QR، جاري إعادة المحاولة...',
          attempt: this.qrRetryAttempts,
          maxAttempts: this.maxQrRetryAttempts,
          phoneId: options.phoneId || null
        });
        
        // محاولة أخرى إذا لم نصل للحد الأقصى
        if (this.qrRetryAttempts < this.maxQrRetryAttempts) {
          setTimeout(() => {
            this.requestNewQR({ retry: true, timeout: true, phoneId: options.phoneId });
          }, 2000);
        }
      }
    }, 10000); // 10 ثواني كحد أقصى لانتظار استجابة الخادم
    
    // تحديد ما إذا كنا نستخدم init_whatsapp أو request_new_qr
    let eventName = 'connect_whatsapp';
    let eventData = { 
      phoneId: options.phoneId || this.currentPhoneId,
      phoneNumber: options.phoneNumber || '',
      phoneName: options.phoneName || '',
      retryAttempt: this.qrRetryAttempts,
      maxRetries: this.maxQrRetryAttempts
    };
    
    console.log('إرسال طلب:', eventName, eventData);
    
    // إرسال الطلب إلى الخادم
    const result = this.sendToServer(eventName, eventData);
    
    // إذا فشل إرسال الطلب، نلغي مؤقت الاستجابة
    if (!result) {
      clearTimeout(responseTimeout);
      this.isQrGenerating = false;
      this.emit('send_failed', { message: 'فشل في إرسال الطلب للخادم' });
    }
    
    return result;
  }

  // إضافة مستمع لحدث
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // إزالة مستمع لحدث
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // إطلاق حدث محلي
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// إنشاء نسخة واحدة من الخدمة للاستخدام في جميع أنحاء التطبيق
const whatsAppSocketService = new WhatsAppSocketService();

export default whatsAppSocketService;