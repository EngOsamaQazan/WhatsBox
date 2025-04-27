import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Container, Typography, Box, Button, Paper, CircularProgress, 
  Alert, AlertTitle, Grid, MenuItem, Select, InputLabel, FormControl, 
  TextField, Chip, Tooltip, Stack, Slider, Switch, FormControlLabel, 
  FormGroup, Divider, Stepper, Step, StepLabel, StepContent 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SpeedIcon from '@mui/icons-material/Speed';
import KeyIcon from '@mui/icons-material/Key';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import readXlsxFile from 'read-excel-file';
import axios from 'axios';
import { useMessages } from '../context/MessageContext';

function SendMessages() {
  const navigate = useNavigate();
  const { dispatch } = useMessages();
  
  // حالة الملف وتحليله
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [phoneColumn, setPhoneColumn] = useState('');
  const [messageColumn, setMessageColumn] = useState('');
  const [mediaColumn, setMediaColumn] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageSource, setImageSource] = useState('upload');
  const imageInputRef = useRef(null);
  
  // متغيرات الإرسال والتحكم
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [copiedColumn, setCopiedColumn] = useState('');
  
  // متغيرات جديدة لجدولة الرسائل ومعدل الإرسال
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [messagesPerMinute, setMessagesPerMinute] = useState(10);
  const [scheduledJobId, setScheduledJobId] = useState(null);
  
  // متغيرات جديدة لتحديد ساعات العمل
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [processingQueue, setProcessingQueue] = useState(false);
  
  // متغيرات جديدة لإعدادات API
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);
  
  // معرف للدفعة الحالية
  const [currentBatchId, setCurrentBatchId] = useState('');
  
  // لتخزين البريفيو للنتائج
  const [previewMessages, setPreviewMessages] = useState([]);
  
  // حفظ واسترجاع إعدادات API من التخزين المحلي
  useEffect(() => {
    const savedApiKey = localStorage.getItem('whatsbox_api_key');
    const savedSenderId = localStorage.getItem('whatsbox_sender_id');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedSenderId) setSenderId(savedSenderId);
    
    // استرجاع الإعدادات المحفوظة
    loadSettings();
  }, []);
  
  // استرجاع الإعدادات من التخزين المحلي
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
        }
      }
    } catch (err) {
      console.error('خطأ في تحميل الإعدادات:', err);
    }
  };
  
  // حفظ إعدادات API في التخزين المحلي عند تغييرها
  const saveApiSettings = () => {
    localStorage.setItem('whatsbox_api_key', apiKey);
    localStorage.setItem('whatsbox_sender_id', senderId);
    setShowApiSettings(false);
    setError('');
    
    // تحديث الإعدادات العامة أيضًا
    try {
      const settingsJson = localStorage.getItem('whatsbox_settings');
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      
      settings.api = {
        apiKey,
        senderId
      };
      
      localStorage.setItem('whatsbox_settings', JSON.stringify(settings));
    } catch (err) {
      console.error('خطأ في حفظ الإعدادات:', err);
    }
  };

  // معالجة رفع ملف الإكسل
  const handleFileUpload = async (event) => {
    try {
      setError('');
      const uploadedFile = event.target.files[0];
      if (!uploadedFile) return;

      setFile(uploadedFile);
      setLoading(true);

      const rows = await readXlsxFile(uploadedFile);
      if (rows.length === 0) {
        throw new Error('الملف فارغ');
      }

      // استخراج أسماء الأعمدة من الصف الأول
      const headerRow = rows[0];
      setColumns(headerRow);

      // استخراج البيانات من باقي الصفوف
      const excelData = rows.slice(1).map(row => {
        const rowData = {};
        row.forEach((cell, index) => {
          rowData[headerRow[index]] = cell;
        });
        return rowData;
      });

      setData(excelData);
      setLoading(false);
      setActiveStep(1);
    } catch (err) {
      setLoading(false);
      setError('حدث خطأ أثناء قراءة الملف: ' + err.message);
    }
  };

  // إنشاء عرض مسبق للرسائل قبل الإرسال
  const generatePreview = () => {
    if (!phoneColumn) {
      setError('يرجى اختيار عمود رقم الهاتف');
      return false;
    }

    if (messageType === 'text' && !messageTemplate) {
      setError('يرجى كتابة قالب الرسالة');
      return false;
    }

    if (messageType === 'image' && imageSource === 'excel' && !mediaColumn) {
      setError('يرجى اختيار عمود رابط الصورة');
      return false;
    }

    if (messageType === 'image' && imageSource === 'upload' && !uploadedImage) {
      setError('يرجى تحميل صورة');
      return false;
    }

    if (scheduleEnabled && !scheduledTime) {
      setError('يرجى تحديد وقت الجدولة');
      return false;
    }
    
    // إنشاء معرف فريد للدفعة
    const batchId = uuidv4();
    setCurrentBatchId(batchId);
    
    // إنشاء مجموعة من الرسائل للعرض المسبق
    const previewData = [];
    
    // إضافة حد أقصى 5 رسائل للعرض المسبق
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const row = data[i];
      const phoneNumber = row[phoneColumn];
      if (!phoneNumber) continue;

      let messageText = '';
      // استبدال المتغيرات في قالب الرسالة بالقيم من الصف الحالي
      messageText = messageTemplate;
      
      // البحث عن جميع المتغيرات بالصيغة {اسم_العمود} واستبدالها بالقيم المناسبة
      columns.forEach(column => {
        const placeholder = `{${column}}`;
        if (messageText.includes(placeholder)) {
          const value = row[column] !== undefined && row[column] !== null ? row[column].toString() : '';
          messageText = messageText.split(placeholder).join(value);
        }
      });

      let mediaUrl = '';
      if (messageType === 'image') {
        if (imageSource === 'excel') {
          mediaUrl = row[mediaColumn] || '';
        } else if (imageSource === 'upload') {
          mediaUrl = uploadedImage;
        }
      }
      
      // تحديد نوع الرسالة بناءً على المحتوى
      let type = messageType;
      if (messageType === 'image' && messageText) {
        type = 'image_text'; // نوع جديد للصورة مع نص
      }
      
      // إضافة الرسالة إلى العرض المسبق
      previewData.push({
        id: uuidv4(),
        batchId,
        phoneNumber,
        messageContent: messageText,
        mediaUrl,
        type,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
    }
    
    setPreviewMessages(previewData);
    return true;
  };

  // دالة للتحويل إلى الخطوة التالية
  const handleNext = () => {
    if (activeStep === 1) {
      // إذا كنا في الخطوة الثانية، إنشاء العرض المسبق قبل الانتقال
      if (generatePreview()) {
        setActiveStep((prevStep) => prevStep + 1);
      }
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // دالة للعودة إلى الخطوة السابقة
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // دالة لإرسال الرسائل وتتبع التقدم
  const handleSendMessages = async () => {
    try {
      // إذا لم يكن هناك معرف للدفعة، إنشاء واحد جديد
      if (!currentBatchId) {
        setCurrentBatchId(uuidv4());
      }
      
      // إنشاء الرسائل بحالة معلقة
      const messagesData = data.map(row => {
        const phoneNumber = row[phoneColumn];
        if (!phoneNumber) return null;

        let messageText = '';
        // استبدال المتغيرات في قالب الرسالة بالقيم من الصف الحالي
        messageText = messageTemplate;
        
        // البحث عن جميع المتغيرات بالصيغة {اسم_العمود} واستبدالها بالقيم المناسبة
        columns.forEach(column => {
          const placeholder = `{${column}}`;
          if (messageText.includes(placeholder)) {
            const value = row[column] !== undefined && row[column] !== null ? row[column].toString() : '';
            messageText = messageText.split(placeholder).join(value);
          }
        });

        let mediaUrl = '';
        if (messageType === 'image') {
          if (imageSource === 'excel') {
            mediaUrl = row[mediaColumn] || '';
          } else if (imageSource === 'upload') {
            mediaUrl = uploadedImage;
          }
        }
        
        // تحديد نوع الرسالة بناءً على المحتوى
        let type = messageType;
        if (messageType === 'image' && messageText) {
          type = 'image_text'; // نوع جديد للصورة مع نص
        }
        
        return {
          id: uuidv4(),
          batchId: currentBatchId,
          phoneNumber,
          messageContent: messageText,
          mediaUrl,
          type,
          status: 'pending',
          timestamp: new Date().toISOString()
        };
      }).filter(Boolean);
      
      // إضافة الرسائل إلى سياق التطبيق
      dispatch({ type: 'ADD_MESSAGES', payload: messagesData });
      
      // الانتقال إلى صفحة التقدم
      navigate(`/progress/${currentBatchId}`);
      
      // إرسال الرسائل في الخلفية
      const response = await fetch('/api/send-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesData,
          apiSettings: {
            apiKey,
            senderId
          },
          sendSettings: {
            messagesPerMinute,
            scheduleEnabled,
            scheduledTime,
            workingHoursEnabled,
            workingHoursStart,
            workingHoursEnd
          }
        }),
      });
      
      // لا نحتاج للانتظار هنا لأننا قمنا بالتوجيه إلى صفحة التقدم
    } catch (error) {
      console.error('Error sending messages:', error);
      setError('حدث خطأ أثناء إرسال الرسائل: ' + error.message);
    }
  };
  
  // وظيفة تحميل الصورة مباشرة
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // نسخ اسم العمود وإضافته إلى قالب الرسالة
  const handleCopyColumn = (column) => {
    const columnPlaceholder = `{${column}}`;
    
    // إضافة المتغير إلى نص الرسالة في موضع المؤشر أو في النهاية
    const textField = document.getElementById('message-template');
    if (textField) {
      const start = textField.selectionStart;
      const end = textField.selectionEnd;
      const currentValue = messageTemplate;
      const newValue = currentValue.substring(0, start) + columnPlaceholder + currentValue.substring(end);
      setMessageTemplate(newValue);
      
      // تعيين التركيز مرة أخرى على حقل النص بعد إضافة المتغير
      setTimeout(() => {
        textField.focus();
        textField.setSelectionRange(start + columnPlaceholder.length, start + columnPlaceholder.length);
      }, 100);
    } else {
      // إذا لم يكن هناك حقل نص، فقط أضف المتغير في النهاية
      setMessageTemplate(messageTemplate + columnPlaceholder);
    }
    
    // تعيين العمود المنسوخ لإظهار تأكيد بصري
    setCopiedColumn(column);
    setTimeout(() => setCopiedColumn(''), 2000);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFile(null);
    setData([]);
    setColumns([]);
    setPhoneColumn('');
    setMessageColumn('');
    setMediaColumn('');
    setMessageType('text');
    setMessageTemplate('');
    setUploadedImage(null);
    setImageSource('upload');
    setError('');
    setActiveStep(0);
    setShowApiSettings(false);
    
    // إعادة تعيير متغيرات الجدولة ومعدل الإرسال
    setScheduleEnabled(false);
    setScheduledTime('');
    
    // إعادة تعيين معرف الدفعة
    setCurrentBatchId('');
    
    // إعادة تعيين العرض المسبق
    setPreviewMessages([]);
    
    // إلغاء أي مهمة مجدولة إذا كانت موجودة
    if (scheduledJobId) {
      clearTimeout(scheduledJobId);
      setScheduledJobId(null);
    }
  };

  // خطوات المعالج
  const steps = [
    {
      label: 'رفع ملف إكسل',
      description: 'قم برفع ملف إكسل يحتوي على الأرقام والرسائل المراد إرسالها.',
      content: (
        <Box textAlign="center">
          <input
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="raised-button-file"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="raised-button-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
              size="large"
              sx={{ py: 1.5, px: 4 }}
            >
              رفع ملف إكسل
            </Button>
          </label>
          {file && (
            <Typography sx={{ mt: 2 }}>
              تم اختيار: {file.name}
            </Typography>
          )}
          {loading && <CircularProgress sx={{ mt: 2 }} />}
        </Box>
      )
    },
    {
      label: 'إعداد الرسائل',
      description: 'قم بتحديد الأعمدة ونوع الرسائل ومحتواها.',
      content: (
        <Box>
          {/* إعدادات API */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<KeyIcon />}
              onClick={() => setShowApiSettings(!showApiSettings)}
              sx={{ mb: 2 }}
            >
              {showApiSettings ? 'إخفاء إعدادات API' : 'تعديل إعدادات API'}
            </Button>
            
            {showApiSettings && (
              <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                <Typography variant="subtitle1" gutterBottom>
                  إعدادات الاتصال بالـ API
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="مفتاح API"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: <KeyIcon color="primary" sx={{ mr: 1 }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="معرف المرسل"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: <AccountCircleIcon color="primary" sx={{ mr: 1 }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={saveApiSettings}
                    >
                      حفظ الإعدادات
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
          
          <Typography variant="h6" gutterBottom>
            تحديد الأعمدة
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="phone-column-label">عمود رقم الهاتف *</InputLabel>
                <Select
                  labelId="phone-column-label"
                  value={phoneColumn}
                  onChange={(e) => setPhoneColumn(e.target.value)}
                  label="عمود رقم الهاتف *"
                  required
                >
                  {columns.map((column, index) => (
                    <MenuItem key={index} value={column}>{column}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="message-type-label">نوع الرسالة</InputLabel>
                <Select
                  labelId="message-type-label"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  label="نوع الرسالة"
                >
                  <MenuItem value="text">نص</MenuItem>
                  <MenuItem value="image">صورة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* خيارات جدولة الرسائل */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                خيارات الإرسال
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="جدولة الإرسال لوقت لاحق"
                />
              </FormGroup>
              {scheduleEnabled && (
                <TextField
                  fullWidth
                  margin="normal"
                  label="وقت الإرسال"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormGroup>
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
              </FormGroup>
              {workingHoursEnabled && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="من الساعة"
                      type="time"
                      value={workingHoursStart}
                      onChange={(e) => setWorkingHoursStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      required
                      sx={{ width: '50%' }}
                    />
                    <TextField
                      label="إلى الساعة"
                      type="time"
                      value={workingHoursEnd}
                      onChange={(e) => setWorkingHoursEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      required
                      sx={{ width: '50%' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    سيتم إيقاف الإرسال خارج ساعات العمل وتأجيل الرسائل المتبقية لليوم التالي
                  </Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2 }}>
                <Typography id="messages-per-minute-slider" gutterBottom>
                  معدل الإرسال: {messagesPerMinute} رسالة في الدقيقة
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <SpeedIcon color="primary" />
                  <Slider
                    value={messagesPerMinute}
                    onChange={(e, newValue) => setMessagesPerMinute(newValue)}
                    aria-labelledby="messages-per-minute-slider"
                    valueLabelDisplay="auto"
                    step={1}
                    marks
                    min={1}
                    max={30}
                  />
                </Stack>
              </Box>
            </Grid>
            {messageType === 'text' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    الأعمدة المتاحة للاستخدام في قالب الرسالة:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {columns.map((column, index) => (
                      <Tooltip 
                        key={index} 
                        title="انقر للإضافة" 
                        arrow
                        open={copiedColumn === column ? true : undefined}
                      >
                        <Chip
                          label={column}
                          onClick={() => handleCopyColumn(column)}
                          icon={<ContentCopyIcon fontSize="small" />}
                          color={copiedColumn === column ? "success" : "default"}
                          variant="outlined"
                        />
                      </Tooltip>
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    id="message-template"
                    label="قالب الرسالة *"
                    placeholder="اكتب رسالتك هنا مع استخدام المتغيرات بالصيغة {اسم_العمود}"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    helperText="يمكنك استخدام المتغيرات من الأعمدة المتاحة بالصيغة {اسم_العمود}"
                    required
                    margin="normal"
                  />
                </Grid>
              </>
            )}
            {messageType === 'image' && (
              <>
                <Grid item xs={12} md={12}>
                  <FormControl component="fieldset" margin="normal">
                    <Typography variant="subtitle2" gutterBottom>
                      مصدر الصورة:
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Button 
                        variant={imageSource === 'upload' ? "contained" : "outlined"}
                        onClick={() => setImageSource('upload')}
                        startIcon={<ImageIcon />}
                      >
                        تحميل صورة
                      </Button>
                      <Button 
                        variant={imageSource === 'excel' ? "contained" : "outlined"}
                        onClick={() => setImageSource('excel')}
                        startIcon={<CloudUploadIcon />}
                      >
                        من ملف الإكسل
                      </Button>
                    </Stack>
                  </FormControl>
                </Grid>
                
                {imageSource === 'upload' && (
                  <Grid item xs={12} md={12}>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="image-upload-button"
                        type="file"
                        onChange={handleImageUpload}
                        ref={imageInputRef}
                      />
                      <label htmlFor="image-upload-button">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<ImageIcon />}
                        >
                          اختر صورة
                        </Button>
                      </label>
                      {uploadedImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={uploadedImage} 
                            alt="الصورة المحملة" 
                            style={{ maxWidth: '100%', maxHeight: '200px' }} 
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}
                
                {imageSource === 'excel' && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="media-column-label">عمود رابط الصورة *</InputLabel>
                      <Select
                        labelId="media-column-label"
                        value={mediaColumn}
                        onChange={(e) => setMediaColumn(e.target.value)}
                        label="عمود رابط الصورة *"
                        required
                      >
                        {columns.map((column, index) => (
                          <MenuItem key={index} value={column}>{column}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    الأعمدة المتاحة للاستخدام في نص الرسالة:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {columns.map((column, index) => (
                      <Tooltip 
                        key={index} 
                        title="انقر للإضافة" 
                        arrow
                        open={copiedColumn === column ? true : undefined}
                      >
                        <Chip
                          label={column}
                          onClick={() => handleCopyColumn(column)}
                          icon={<ContentCopyIcon fontSize="small" />}
                          color={copiedColumn === column ? "success" : "default"}
                          variant="outlined"
                        />
                      </Tooltip>
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    id="message-template"
                    label="نص الرسالة (اختياري)"
                    placeholder="اكتب نص الرسالة هنا مع استخدام المتغيرات بالصيغة {اسم_العمود}"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    helperText="يمكنك استخدام المتغيرات من الأعمدة المتاحة بالصيغة {اسم_العمود}"
                    margin="normal"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      )
    },
    {
      label: 'معاينة ومراجعة',
      description: 'راجع الرسائل قبل الإرسال.',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            معاينة الرسائل
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Alert severity="info">
              <AlertTitle>معلومات الإرسال</AlertTitle>
              <Typography variant="body2">
                عدد الرسائل: {data.length}
              </Typography>
              <Typography variant="body2">
                نوع الرسالة: {messageType === 'text' ? 'نص' : 'صورة'}
              </Typography>
              {scheduleEnabled && (
                <Typography variant="body2">
                  وقت الجدولة: {new Date(scheduledTime).toLocaleString('ar-SA')}
                </Typography>
              )}
              {workingHoursEnabled && (
                <Typography variant="body2">
                  ساعات العمل: من {workingHoursStart} إلى {workingHoursEnd}
                </Typography>
              )}
              <Typography variant="body2">
                معدل الإرسال: {messagesPerMinute} رسالة في الدقيقة
              </Typography>
            </Alert>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            نماذج من الرسائل (الخمس الأولى):
          </Typography>
          
          <Box sx={{ mb: 2, maxHeight: 300, overflow: 'auto' }}>
            {previewMessages.length > 0 ? (
              previewMessages.map((message, index) => (
                <Paper key={index} elevation={1} sx={{ p: 2, mb: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">الرقم:</Typography>
                      <Typography>{message.phoneNumber}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <Typography variant="subtitle2">الرسالة:</Typography>
                      <Typography variant="body2">{message.messageContent || 'بدون نص'}</Typography>
                    </Grid>
                    {message.mediaUrl && message.type.includes('image') && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">الصورة:</Typography>
                        {typeof message.mediaUrl === 'string' && message.mediaUrl.startsWith('data:') ? (
                          <Box sx={{ mt: 1, textAlign: 'center' }}>
                            <img 
                              src={message.mediaUrl} 
                              alt="معاينة الصورة" 
                              style={{ maxWidth: '100%', maxHeight: '100px' }} 
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2">
                            رابط الصورة: {message.mediaUrl.substring(0, 50)}
                            {message.mediaUrl.length > 50 ? '...' : ''}
                          </Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary">
                لا توجد رسائل للمعاينة
              </Typography>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            * بعد النقر على زر "إرسال الرسائل"، سيتم نقلك إلى صفحة التقدم لمتابعة عملية الإرسال.
          </Typography>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          إرسال رسائل واتساب
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          قم برفع ملف إكسل وإرسال رسائل واتساب للأرقام المحددة
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="subtitle1">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    {step.content}
                  </Box>
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <div>
                      <Button
                        disabled={index === 0}
                        onClick={handleBack}
                        sx={{ mr: 1 }}
                      >
                        رجوع
                      </Button>
                      {activeStep === steps.length - 1 ? (
                        <Button
                          variant="contained"
                          onClick={handleSendMessages}
                          startIcon={<SendIcon />}
                          disabled={loading}
                        >
                          إرسال الرسائل
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          sx={{ mr: 1 }}
                        >
                          التالي
                        </Button>
                      )}
                      <Button
                        variant="text"
                        color="secondary"
                        onClick={resetForm}
                        sx={{ mr: 1 }}
                      >
                        إعادة تعيين
                      </Button>
                    </div>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === steps.length && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography>تم إكمال جميع الخطوات - يمكنك إرسال الرسائل الآن.</Typography>
              <Button onClick={handleSendMessages} sx={{ mt: 1, mr: 1 }}>
                إرسال الرسائل
              </Button>
            </Paper>
          )}
        </Paper>
      </Box>
      
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
}

export default SendMessages;