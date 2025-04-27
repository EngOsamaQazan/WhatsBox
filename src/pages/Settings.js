import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, TextField, 
  Button, Divider, Grid, Switch, FormControlLabel, 
  Alert, Snackbar, Card, CardContent, CardActions 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyIcon from '@mui/icons-material/Key';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorIcon from '@mui/icons-material/Error';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function Settings() {
  // إعدادات API
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  
  // إعدادات ساعات العمل
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  
  // إعدادات معدل الإرسال
  const [messagesPerMinute, setMessagesPerMinute] = useState(10);
  const [randomDelay, setRandomDelay] = useState(true);
  
  // إعدادات الإشعارات
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  
  // إعدادات التخزين
  const [autoCleanEnabled, setAutoCleanEnabled] = useState(false);
  const [cleanAfterDays, setCleanAfterDays] = useState(30);
  
  // حالة الحفظ
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // استرجاع الإعدادات المحفوظة عند تحميل الصفحة
  useEffect(() => {
    loadSettings();
  }, []);
  
  // حفظ الإعدادات في التخزين المحلي للمتصفح
  const saveSettings = () => {
    try {
      const settings = {
        api: {
          apiKey,
          senderId
        },
        workingHours: {
          enabled: workingHoursEnabled,
          start: workingHoursStart,
          end: workingHoursEnd
        },
        sendRate: {
          messagesPerMinute,
          randomDelay
        },
        notifications: {
          enabled: notificationsEnabled,
          emailEnabled: emailNotificationsEnabled,
          email: notificationEmail
        },
        storage: {
          autoClean: autoCleanEnabled,
          cleanAfterDays
        }
      };
      
      localStorage.setItem('whatsbox_settings', JSON.stringify(settings));
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإعدادات: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };
  
  // استرجاع الإعدادات من التخزين المحلي للمتصفح
  const loadSettings = () => {
    try {
      const settingsJson = localStorage.getItem('whatsbox_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        
        // تحميل إعدادات API
        if (settings.api) {
          setApiKey(settings.api.apiKey || '');
          setSenderId(settings.api.senderId || '');
        }
        
        // تحميل إعدادات ساعات العمل
        if (settings.workingHours) {
          setWorkingHoursEnabled(settings.workingHours.enabled || false);
          setWorkingHoursStart(settings.workingHours.start || '09:00');
          setWorkingHoursEnd(settings.workingHours.end || '17:00');
        }
        
        // تحميل إعدادات معدل الإرسال
        if (settings.sendRate) {
          setMessagesPerMinute(settings.sendRate.messagesPerMinute || 10);
          setRandomDelay(settings.sendRate.randomDelay || true);
        }
        
        // تحميل إعدادات الإشعارات
        if (settings.notifications) {
          setNotificationsEnabled(settings.notifications.enabled || true);
          setEmailNotificationsEnabled(settings.notifications.emailEnabled || false);
          setNotificationEmail(settings.notifications.email || '');
        }
        
        // تحميل إعدادات التخزين
        if (settings.storage) {
          setAutoCleanEnabled(settings.storage.autoClean || false);
          setCleanAfterDays(settings.storage.cleanAfterDays || 30);
        }
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحميل الإعدادات: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };
  
  // إعادة تعيين جميع الإعدادات
  const resetSettings = () => {
    if (window.confirm('هل أنت متأكد أنك تريد إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
      setApiKey('');
      setSenderId('');
      setWorkingHoursEnabled(false);
      setWorkingHoursStart('09:00');
      setWorkingHoursEnd('17:00');
      setMessagesPerMinute(10);
      setRandomDelay(true);
      setNotificationsEnabled(true);
      setEmailNotificationsEnabled(false);
      setNotificationEmail('');
      setAutoCleanEnabled(false);
      setCleanAfterDays(30);
      
      localStorage.removeItem('whatsbox_settings');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          إعدادات النظام
        </Typography>
        <Typography color="text.secondary" paragraph>
          تخصيص إعدادات النظام حسب احتياجاتك
        </Typography>
      </Box>
      
      <Snackbar 
        open={isSuccess} 
        autoHideDuration={3000} 
        onClose={() => setIsSuccess(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          تم حفظ الإعدادات بنجاح
        </Alert>
      </Snackbar>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* إعدادات API */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <KeyIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                إعدادات API
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="مفتاح API"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  variant="outlined"
                  size="small"
                  helperText="أدخل مفتاح API الخاص بك للاتصال بخدمة WhatsBox"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="معرف المرسل"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  variant="outlined"
                  size="small"
                  helperText="أدخل رقم هاتف واتساب الخاص بك كمعرف للمرسل"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* إعدادات ساعات العمل */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                ساعات العمل
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workingHoursEnabled}
                      onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تقييد الإرسال بساعات العمل"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="من الساعة"
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  disabled={!workingHoursEnabled}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="إلى الساعة"
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  disabled={!workingHoursEnabled}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  سيتم إيقاف الإرسال خارج ساعات العمل وتأجيل الرسائل المتبقية لليوم التالي
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* إعدادات معدل الإرسال */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <SpeedIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                معدل الإرسال
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="عدد الرسائل في الدقيقة"
                  type="number"
                  value={messagesPerMinute}
                  onChange={(e) => setMessagesPerMinute(parseInt(e.target.value, 10))}
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 1, max: 60 }}
                  helperText="الحد الأقصى المسموح: 60 رسالة في الدقيقة"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={randomDelay}
                      onChange={(e) => setRandomDelay(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="إضافة تأخير عشوائي بين الرسائل"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  يساعد على تجنب الحظر من قبل واتساب
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* إعدادات الإشعارات */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <ErrorIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                الإشعارات
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تفعيل إشعارات المتصفح"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotificationsEnabled}
                      onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تفعيل إشعارات البريد الإلكتروني"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني للإشعارات"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={!emailNotificationsEnabled}
                  type="email"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* إعدادات التخزين */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <SystemUpdateAltIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                إعدادات التخزين
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoCleanEnabled}
                      onChange={(e) => setAutoCleanEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تنظيف تلقائي لسجل الرسائل القديمة"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="تنظيف الرسائل الأقدم من (أيام)"
                  type="number"
                  value={cleanAfterDays}
                  onChange={(e) => setCleanAfterDays(parseInt(e.target.value, 10))}
                  variant="outlined"
                  size="small"
                  disabled={!autoCleanEnabled}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* بطاقة النسخة والترخيص */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                معلومات النظام
              </Typography>
              <Typography variant="h5" component="div">
                WhatsBox Sender
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                الإصدار 1.0.0
              </Typography>
              <Typography variant="body2">
                نظام إرسال وتتبع رسائل واتساب متكامل من خلال WhatsBox API.
                <br />
                جميع الحقوق محفوظة &copy; {new Date().getFullYear()}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">تحقق من التحديثات</Button>
              <Button size="small">عرض الترخيص</Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* أزرار الحفظ وإعادة التعيين */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              color="error"
              onClick={resetSettings}
            >
              إعادة تعيين الإعدادات
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={saveSettings}
            >
              حفظ الإعدادات
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Settings;