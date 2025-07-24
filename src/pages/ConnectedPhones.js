import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Button, TextField, 
  Paper, Grid, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Chip, Divider, IconButton, CircularProgress, Alert
} from '@mui/material';
import { useMessages } from '../context/MessageContext';
import QRCode from 'react-qr-code';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import QrCodeIcon from '@mui/icons-material/QrCode';
import KeyIcon from '@mui/icons-material/Key';
import { v4 as uuidv4 } from 'uuid';
import whatsAppSocketService from '../services/whatsappSocket';
import supabase, { fallbackStorage } from '../config/supabase';

function ConnectedPhones() {
  const { state, dispatch } = useMessages();
  const { connectedPhones, isSupabaseAvailable, usingFallback } = state;
  
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [currentPhoneId, setCurrentPhoneId] = useState('');
  
  // نموذج إضافة رقم جديد
  const [formData, setFormData] = useState({
    phoneNumber: '',
    phoneName: '',
    apiKey: '',
    senderId: '',
    connectionType: 'qr' // 'qr' أو 'api'
  });
  
  // تهيئة خدمة Socket عند تحميل المكون
  useEffect(() => {
    if (!whatsAppSocketService.socket) {
      whatsAppSocketService.connect();
    }
    
    // إعداد المستمعين للأحداث
    whatsAppSocketService.on('qr_received', handleQRReceived);
    whatsAppSocketService.on('whatsapp_authenticated', handleWhatsAppAuthenticated);
    whatsAppSocketService.on('whatsapp_ready', handleWhatsAppReady);
    whatsAppSocketService.on('whatsapp_disconnected', handleWhatsAppDisconnected);
    whatsAppSocketService.on('qr_error', handleQRError);
    whatsAppSocketService.on('qr_timeout', handleQRTimeout);
    whatsAppSocketService.on('qr_generating', handleQRGenerating);
    whatsAppSocketService.on('requesting_new_qr', handleRequestingNewQR);
    whatsAppSocketService.on('max_qr_retry_attempts', handleMaxQRRetryAttempts);
    whatsAppSocketService.on('qr_generation_timeout', handleQRGenerationTimeout);
    
    // فصل المستمعين عند إزالة المكون
    return () => {
      whatsAppSocketService.off('qr_received', handleQRReceived);
      whatsAppSocketService.off('whatsapp_authenticated', handleWhatsAppAuthenticated);
      whatsAppSocketService.off('whatsapp_ready', handleWhatsAppReady);
      whatsAppSocketService.off('whatsapp_disconnected', handleWhatsAppDisconnected);
      whatsAppSocketService.off('qr_error', handleQRError);
      whatsAppSocketService.off('qr_timeout', handleQRTimeout);
      whatsAppSocketService.off('qr_generating', handleQRGenerating);
      whatsAppSocketService.off('requesting_new_qr', handleRequestingNewQR);
      whatsAppSocketService.off('max_qr_retry_attempts', handleMaxQRRetryAttempts);
      whatsAppSocketService.off('qr_generation_timeout', handleQRGenerationTimeout);
    };
  }, []);
  
  // معالجة استلام رمز QR
  const handleQRReceived = (data) => {
    console.log('QR received in component:', data);
    setQrCode(data.qr);
    setIsLoading(false);
    setError('');
    // التأكد من أن مربع الحوار مفتوح لعرض رمز QR
    if (!openDialog) {
      setDialogType('qr');
      setOpenDialog(true);
    }
  };
  
  // معالجة خطأ في رمز QR
  const handleQRError = (data) => {
    console.log('QR error in component:', data);
    setError(data.message || 'حدث خطأ في رمز QR، جاري إعادة المحاولة...');
  };
  
  // معالجة انتهاء مهلة رمز QR
  const handleQRTimeout = (data) => {
    console.log('QR timeout in component:', data);
    setError(data.message || 'انتهت صلاحية رمز QR، جاري إعادة المحاولة...');
  };
  
  // معالجة بدء توليد رمز QR
  const handleQRGenerating = (data) => {
    console.log('QR generating in component:', data);
    setIsLoading(true);
    setError(data.message || 'جاري توليد رمز QR، يرجى الانتظار...');
  };
  
  // معالجة طلب رمز QR جديد
  const handleRequestingNewQR = (data) => {
    console.log('Requesting new QR in component:', data);
    setIsLoading(true);
    setQrCode('');
    setError(`${data.message || 'جاري طلب رمز QR جديد...'} (محاولة ${data.attempt || 1}/${data.maxAttempts || 3})`);
  };
  
  // معالجة الوصول للحد الأقصى من محاولات توليد رمز QR
  const handleMaxQRRetryAttempts = (data) => {
    console.log('Max QR retry attempts in component:', data);
    setIsLoading(false);
    setError(data.message || 'تم الوصول إلى الحد الأقصى من محاولات توليد رمز QR، يرجى المحاولة يدويًا.');
  };
  
  // معالجة انتهاء مهلة توليد رمز QR
  const handleQRGenerationTimeout = (data) => {
    console.log('QR generation timeout in component:', data);
    setError(`${data.message || 'انتهت مهلة انتظار توليد رمز QR'} (محاولة ${data.attempt || 1}/${data.maxAttempts || 3})`);
  };
  
  // معالجة نجاح التوثيق
  const handleWhatsAppAuthenticated = (data) => {
    console.log('WhatsApp authenticated in component:', data);
    setQrCode('');
    
    // تحديث حالة الرقم في واجهة المستخدم
    dispatch({ 
      type: 'UPDATE_CONNECTED_PHONE', 
      payload: { 
        id: data.phoneId, 
        status: 'active' 
      } 
    });
    
    setIsLoading(false);
  };
  
  // معالجة جاهزية واتساب
  const handleWhatsAppReady = (data) => {
    console.log('WhatsApp ready in component:', data);
    
    // تحديث حالة الرقم في واجهة المستخدم
    dispatch({ 
      type: 'UPDATE_CONNECTED_PHONE', 
      payload: { 
        id: data.phoneId, 
        status: 'active' 
      } 
    });
  };
  
  // معالجة قطع اتصال واتساب
  const handleWhatsAppDisconnected = (data) => {
    console.log('WhatsApp disconnected in component:', data);
    
    // تحديث حالة الرقم في واجهة المستخدم
    dispatch({ 
      type: 'UPDATE_CONNECTED_PHONE', 
      payload: { 
        id: data.phoneId, 
        status: 'inactive' 
      } 
    });
  };
  
  // فتح مربع حوار إضافة رقم جديد
  const handleOpenAddDialog = () => {
    setDialogType('add');
    setOpenDialog(true);
    setFormData({
      phoneNumber: '',
      phoneName: '',
      apiKey: '',
      senderId: '',
      connectionType: 'qr'
    });
    setError('');
  };
  
  // فتح مربع حوار QR لربط رقم
  const handleOpenQRDialog = (phoneId) => {
    setDialogType('qr');
    setOpenDialog(true);
    setCurrentPhoneId(phoneId);
    setQrCode('');
    setIsLoading(true);
    setError('جاري تهيئة واتساب، قد تستغرق العملية بضع ثوان...');
    
    // استخدام الدالة المحسنة لطلب رمز QR جديد
    whatsAppSocketService.requestNewQR({ manual: true, phoneId: phoneId });
    
    // إعلام المستخدم بأن العملية قد تستغرق بعض الوقت
    setTimeout(() => {
      if (isLoading && !qrCode) {
        setError('جاري تهيئة واتساب، قد تستغرق العملية بضع ثوان... يرجى الانتظار');
      }
    }, 5000);
    
    // إعداد مؤقت للتحقق من استمرار التحميل لفترة طويلة
    setTimeout(() => {
      if (isLoading && !qrCode) {
        setError('يبدو أن هناك مشكلة في الاتصال. يمكنك إعادة المحاولة أو إغلاق مربع الحوار والمحاولة مرة أخرى.');
      }
    }, 20000);
  };
  
  // إغلاق مربع الحوار
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setQrCode('');
    setCurrentPhoneId('');
    setError('');
  };
  
  // معالجة تغيير قيم النموذج
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // إضافة رقم جديد
  const handleAddPhone = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // التحقق من صحة البيانات
      if (formData.connectionType === 'qr' && !formData.phoneNumber) {
        throw new Error('يرجى إدخال رقم الهاتف');
      }
      
      if (formData.connectionType === 'api' && (!formData.apiKey || !formData.senderId)) {
        throw new Error('يرجى إدخال مفتاح API ومعرف المرسل');
      }
      
      // إنشاء معرف فريد للرقم
      const phoneId = uuidv4();
      
      // إعداد بيانات الرقم  
      const phoneData = {
        id: phoneId,
        phone_number: formData.phoneNumber,
        phone_name: formData.phoneName || formData.phoneNumber,
        connection_type: formData.connectionType,
        api_key: formData.connectionType === 'api' ? formData.apiKey : null,
        sender_id: formData.connectionType === 'api' ? formData.senderId : null,
        status: 'inactive',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      };
      
      let data = [phoneData];
      
      if (isSupabaseAvailable) {
        // محاولة إضافة الرقم إلى Supabase
        try {
          const { data: supabaseData, error } = await supabase
            .from('connected_phones')
            .insert([phoneData])
            .select();
            
          if (error) throw error;
          data = supabaseData;
        } catch (supabaseError) {
          console.warn('Supabase insert failed, using fallback:', supabaseError);
          // التبديل إلى التخزين المحلي
          fallbackStorage.addPhone(phoneData);
          dispatch({ type: 'SET_SUPABASE_STATUS', payload: { available: false, usingFallback: true } });
        }
      } else {
        // استخدام التخزين المحلي مباشرة
        const success = fallbackStorage.addPhone(phoneData);
        if (!success) {
          throw new Error('فشل في حفظ البيانات في التخزين المحلي');
        }
      }
      
      // إضافة الرقم إلى حالة التطبيق
      dispatch({ type: 'ADD_CONNECTED_PHONE', payload: data[0] });
      
      // إغلاق مربع الحوار
      setOpenDialog(false);
      
      // إذا كان نوع الاتصال هو QR، فتح مربع حوار QR
      if (formData.connectionType === 'qr') {
        handleOpenQRDialog(phoneId);
      }
    } catch (error) {
      console.error('Error adding phone:', error);
      setError(error.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };
  
  // حذف رقم
  const handleDeletePhone = async (phoneId) => {
    try {
      // إرسال طلب لفصل الرقم من الخادم
      whatsAppSocketService.sendToServer('disconnect_whatsapp', { phoneId });
      
      if (isSupabaseAvailable) {
        // محاولة حذف الرقم من Supabase
        try {
          const { error } = await supabase
            .from('connected_phones')
            .delete()
            .eq('id', phoneId);
            
          if (error) throw error;
        } catch (supabaseError) {
          console.warn('Supabase delete failed, using fallback:', supabaseError);
          fallbackStorage.deletePhone(phoneId);
          dispatch({ type: 'SET_SUPABASE_STATUS', payload: { available: false, usingFallback: true } });
        }
      } else {
        // استخدام التخزين المحلي مباشرة
        fallbackStorage.deletePhone(phoneId);
      }
      
      // حذف الرقم من حالة التطبيق
      dispatch({ type: 'REMOVE_CONNECTED_PHONE', payload: phoneId });
    } catch (error) {
      console.error('Error deleting phone:', error);
      setError(error.message);
    }
  };
  
  // تحديث حالة اتصال الرقم
  const handleToggleConnection = (phone) => {
    if (phone.status === 'active') {
      // فصل الرقم
      whatsAppSocketService.sendToServer('disconnect_whatsapp', { phoneId: phone.id });
    } else {
      // إعادة توصيل الرقم
      if (phone.connection_type === 'qr') {
        handleOpenQRDialog(phone.id);
      } else {
        // تفعيل اتصال API
        // يمكن إضافة منطق إضافي هنا إذا لزم الأمر
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          الأرقام المتصلة
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ mb: 3 }}
        >
          إضافة رقم جديد
        </Button>
        
        {/* عرض الأرقام المتصلة */}
        <Grid container spacing={3}>
          {connectedPhones && connectedPhones.length > 0 ? (
            connectedPhones.map((phone) => (
              <Grid item xs={12} sm={6} md={4} key={phone.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WhatsAppIcon sx={{ color: phone.status === 'active' ? 'success.main' : 'text.secondary', mr: 1 }} />
                      <Typography variant="h6" component="div">
                        {phone.phone_name || phone.phone_number}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {phone.phone_number}
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={phone.status === 'active' ? 'متصل' : 'غير متصل'} 
                        color={phone.status === 'active' ? 'success' : 'default'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={phone.connection_type === 'qr' ? 'QR' : 'API'} 
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    {phone.connection_type === 'qr' && (
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenQRDialog(phone.id)}
                        title="مسح رمز QR"
                      >
                        <QrCodeIcon />
                      </IconButton>
                    )}
                    
                    <IconButton 
                      color={phone.status === 'active' ? 'error' : 'success'}
                      onClick={() => handleToggleConnection(phone)}
                      title={phone.status === 'active' ? 'فصل' : 'اتصال'}
                    >
                      <PowerSettingsNewIcon />
                    </IconButton>
                    
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeletePhone(phone.id)}
                      title="حذف"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  لا توجد أرقام متصلة حالياً. قم بإضافة رقم جديد للبدء.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
      
      {/* مربع حوار إضافة رقم جديد */}
      <Dialog open={openDialog && dialogType === 'add'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة رقم جديد</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <TextField
              name="phoneNumber"
              label="رقم الهاتف"
              fullWidth
              margin="normal"
              value={formData.phoneNumber}
              onChange={handleFormChange}
              placeholder="مثال: 966512345678"
              helperText="أدخل رقم الهاتف بصيغة دولية بدون + أو 00"
            />
            
            <TextField
              name="phoneName"
              label="اسم الهاتف (اختياري)"
              fullWidth
              margin="normal"
              value={formData.phoneName}
              onChange={handleFormChange}
              placeholder="مثال: رقم المبيعات"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              نوع الاتصال
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: formData.connectionType === 'qr' ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: formData.connectionType === 'qr' ? 'primary.light' : 'transparent',
                  opacity: formData.connectionType === 'qr' ? 1 : 0.7,
                  '&:hover': {
                    borderColor: 'primary.main',
                    opacity: 1
                  }
                }}
                onClick={() => setFormData(prev => ({ ...prev, connectionType: 'qr' }))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle1">اتصال عبر رمز QR</Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  ربط الرقم مباشرة عبر مسح رمز QR (يتطلب واتساب نشط على الهاتف)
                </Typography>
              </Box>
              
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: formData.connectionType === 'api' ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: formData.connectionType === 'api' ? 'primary.light' : 'transparent',
                  opacity: formData.connectionType === 'api' ? 1 : 0.7,
                  '&:hover': {
                    borderColor: 'primary.main',
                    opacity: 1
                  }
                }}
                onClick={() => setFormData(prev => ({ ...prev, connectionType: 'api' }))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle1">اتصال عبر API</Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  استخدام مفتاح API من مزود خدمة واتساب خارجي
                </Typography>
              </Box>
            </Box>
            
            {formData.connectionType === 'api' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  name="apiKey"
                  label="مفتاح API"
                  fullWidth
                  margin="normal"
                  value={formData.apiKey}
                  onChange={handleFormChange}
                />
                
                <TextField
                  name="senderId"
                  label="معرف المرسل"
                  fullWidth
                  margin="normal"
                  value={formData.senderId}
                  onChange={handleFormChange}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button 
            onClick={handleAddPhone} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* مربع حوار QR */}
      <Dialog open={openDialog && dialogType === 'qr'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>مسح رمز QR للاتصال</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity={error.includes('تم الوصول إلى الحد الأقصى') ? "warning" : "info"} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            {isLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={60} thickness={4} />
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>جاري تحميل رمز QR...</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  قد تستغرق العملية بضع ثوان، يرجى الانتظار
                </Typography>
                {/* إضافة زر إعادة المحاولة حتى أثناء التحميل */}
                {error && error.includes('انتهت مهلة') && (
                  <Button 
                    variant="outlined" 
                    color="primary"
                    startIcon={<RefreshIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => {
                      whatsAppSocketService.requestNewQR({ manual: true, phoneId: currentPhoneId });
                    }}
                  >
                    إعادة المحاولة
                  </Button>
                )}
              </Box>
            ) : qrCode ? (
              <>
                <Box sx={{ border: '8px solid #25D366', borderRadius: '8px', p: 1, bgcolor: '#fff' }}>
                  <QRCode value={qrCode} size={256} />
                </Box>
                <Typography variant="subtitle1" sx={{ mt: 3, textAlign: 'center', fontWeight: 'bold', color: 'primary.main' }}>
                  افتح واتساب على هاتفك وامسح رمز QR هذا
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  1. افتح واتساب على هاتفك
                  <br />
                  2. انقر على القائمة (⋮) أو الإعدادات
                  <br />
                  3. اختر "الأجهزة المرتبطة"
                  <br />
                  4. انقر على "ربط جهاز"
                  <br />
                  5. وجه كاميرا هاتفك نحو رمز QR هذا
                </Typography>
                <Typography variant="caption" sx={{ mt: 2, textAlign: 'center', color: 'success.main' }}>
                  بمجرد مسح الرمز، سيتم ربط الرقم تلقائياً وستظهر رسالة تأكيد
                </Typography>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {error || 'حدث خطأ في تحميل رمز QR. يرجى المحاولة مرة أخرى.'}
                </Alert>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    // استخدام الدالة المحسنة لطلب رمز QR جديد
                    whatsAppSocketService.requestNewQR({ manual: true, phoneId: currentPhoneId });
                  }}
                >
                  إعادة المحاولة
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">إغلاق</Button>
          {qrCode && (
            <Button 
              onClick={() => {
                // استخدام الدالة المحسنة لطلب رمز QR جديد
                whatsAppSocketService.requestNewQR({ manual: true, phoneId: currentPhoneId });
              }} 
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
            >
              تحديث الرمز
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ConnectedPhones;