import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, LinearProgress, 
  Grid, Card, CardContent, Button, CircularProgress 
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useMessages } from '../context/MessageContext';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';

function ProgressPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { state } = useMessages();
  const [batchMessages, setBatchMessages] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    pending: 0
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // فلترة الرسائل حسب معرف الدفعة
  useEffect(() => {
    const filteredMessages = state.messages.filter(msg => msg.batchId === batchId);
    setBatchMessages(filteredMessages);
    
    if (filteredMessages.length > 0) {
      const completed = filteredMessages.filter(msg => msg.status !== 'pending').length;
      const successful = filteredMessages.filter(msg => msg.status === 'success').length;
      const failed = filteredMessages.filter(msg => msg.status === 'failed').length;
      const pending = filteredMessages.filter(msg => msg.status === 'pending').length;
      
      setStats({
        total: filteredMessages.length,
        completed,
        successful,
        failed,
        pending
      });
      
      setProgress(Math.round((completed / filteredMessages.length) * 100));
      setIsCompleted(pending === 0);
    }
  }, [state.messages, batchId]);
  
  // محاكاة تحديث حالة الرسائل (للعرض فقط - في التطبيق الحقيقي سيتم جلب البيانات من API)
  const refreshProgress = () => {
    // هنا يمكنك إضافة منطق لتحديث حالة الرسائل من الخادم
    // هذا مجرد محاكاة للتحديث
    setTimeout(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 10, 100);
        if (newProgress === 100) {
          setIsCompleted(true);
        }
        return newProgress;
      });
    }, 500);
  };
  
  // إذا لم يتم العثور على رسائل للدفعة المحددة
  if (batchMessages.length === 0) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            لم يتم العثور على دفعة الرسائل المحددة
          </Typography>
          <Typography color="text.secondary" paragraph>
            قد تكون الدفعة غير موجودة أو تم حذفها.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            العودة للرئيسية
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<HistoryIcon />}
            onClick={() => navigate('/log')}
          >
            عرض سجل الرسائل
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {isCompleted ? 'تم إكمال' : 'جاري إرسال'} دفعة الرسائل 
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            معرف الدفعة: {batchId}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            تقدم الإرسال: {progress}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            color={isCompleted ? "success" : "primary"} 
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    {stats.successful}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  رسائل ناجحة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    {stats.failed}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  رسائل فاشلة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <HourglassEmptyIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    {stats.pending}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  رسائل معلقة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Typography variant="h6" gutterBottom>
          آخر الرسائل
        </Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
          {batchMessages.slice(0, 10).map((message, index) => (
            <Paper 
              key={index} 
              elevation={1} 
              sx={{ 
                p: 2, 
                mb: 1, 
                bgcolor: 
                  message.status === 'success' ? '#f1f8e9' : 
                  message.status === 'failed' ? '#ffebee' : 
                  '#fff8e1'
              }}
            >
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">
                    الرقم: {message.phoneNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" align="right">
                    الحالة: {
                      message.status === 'success' ? 'ناجحة' : 
                      message.status === 'failed' ? 'فاشلة' : 
                      'معلقة'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" noWrap>
                    {message.messageContent || 'بدون محتوى'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
        
        <Box display="flex" justifyContent="space-between">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshProgress}
            disabled={isCompleted}
          >
            تحديث الحالة
          </Button>
          
          <Box>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate('/log')}
              sx={{ ml: 1 }}
            >
              سجل الرسائل
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/')}
              sx={{ ml: 1 }}
            >
              لوحة التحكم
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default ProgressPage;