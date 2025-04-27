import React from 'react';
import { Container, Grid, Paper, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useMessages } from '../context/MessageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';

const COLORS = ['#25D366', '#ff4444', '#ffbb33'];

function Dashboard() {
  const { state } = useMessages();
  const { stats } = state;
  
  // بيانات للرسم البياني الدائري
  const pieData = [
    { name: 'ناجحة', value: stats.successful },
    { name: 'فاشلة', value: stats.failed },
    { name: 'معلقة', value: stats.pending }
  ].filter(item => item.value > 0);
  
  // بيانات للرسم البياني الشريطي (آخر 7 أيام)
  const getLast7DaysData = () => {
    const last7Days = [];
    const today = new Date();
    
    // إنشاء مصفوفة للأيام السبعة الماضية
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(date);
      
      last7Days.push({
        day: dayName,
        date: date.toISOString().split('T')[0],
        count: 0
      });
    }
    
    // حساب عدد الرسائل المرسلة في كل يوم
    state.messages.forEach(message => {
      const messageDate = message.timestamp.split('T')[0];
      const dayData = last7Days.find(day => day.date === messageDate);
      if (dayData) {
        dayData.count++;
      }
    });
    
    return last7Days;
  };
  
  const barData = getLast7DaysData();
  
  // احصائيات الرسائل حسب الحالة للأسبوع الماضي
  const getWeeklyStatusData = () => {
    const data = [];
    const statusCounts = {
      success: 0,
      failed: 0,
      pending: 0
    };
    
    // حساب عدد الرسائل حسب الحالة
    state.messages.forEach(message => {
      const messageDate = new Date(message.timestamp);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      if (messageDate >= oneWeekAgo) {
        if (message.status === 'success') statusCounts.success++;
        else if (message.status === 'failed') statusCounts.failed++;
        else if (message.status === 'pending') statusCounts.pending++;
      }
    });
    
    data.push({ 
      name: 'الأسبوع الماضي', 
      ناجحة: statusCounts.success, 
      فاشلة: statusCounts.failed, 
      معلقة: statusCounts.pending 
    });
    
    return data;
  };
  
  const weeklyStatusData = getWeeklyStatusData();

  return (
    <Container maxWidth="lg">
      <Grid container spacing={3}>
        {/* صف العنوان والأزرار */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" component="h1">
              لوحة التحكم
            </Typography>
            <Box>
              <Button 
                component={Link}
                to="/send"
                variant="contained" 
                color="primary" 
                startIcon={<SendIcon />}
                sx={{ ml: 2 }}
              >
                إرسال رسائل
              </Button>
              <Button 
                component={Link}
                to="/log"
                variant="outlined" 
                color="primary" 
                startIcon={<HistoryIcon />}
              >
                سجل الرسائل
              </Button>
            </Box>
          </Box>
        </Grid>
        
        {/* بطاقات الإحصائيات */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              height: 140,
              borderTop: '4px solid #25D366' 
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              إجمالي الرسائل
            </Typography>
            <Typography component="p" variant="h3">
              {stats.totalSent}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              كل الرسائل المرسلة
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              height: 140,
              borderTop: '4px solid #4caf50' 
            }}
          >
            <Typography component="h2" variant="h6" color="success.main" gutterBottom>
              ناجحة
            </Typography>
            <Typography component="p" variant="h3">
              {stats.successful}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              {stats.totalSent > 0 ? Math.round((stats.successful / stats.totalSent) * 100) : 0}% من الإجمالي
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              height: 140,
              borderTop: '4px solid #f44336' 
            }}
          >
            <Typography component="h2" variant="h6" color="error" gutterBottom>
              فاشلة
            </Typography>
            <Typography component="p" variant="h3">
              {stats.failed}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              {stats.totalSent > 0 ? Math.round((stats.failed / stats.totalSent) * 100) : 0}% من الإجمالي
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              height: 140,
              borderTop: '4px solid #ff9800' 
            }}
          >
            <Typography component="h2" variant="h6" color="warning.main" gutterBottom>
              معلقة
            </Typography>
            <Typography component="p" variant="h3">
              {stats.pending}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              {stats.totalSent > 0 ? Math.round((stats.pending / stats.totalSent) * 100) : 0}% من الإجمالي
            </Typography>
          </Paper>
        </Grid>
        
        {/* الرسم البياني للمخطط الشريطي للأيام السبعة الماضية */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography variant="h6" gutterBottom>
              نشاط الرسائل (آخر 7 أيام)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                width={500}
                height={300}
                data={barData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="عدد الرسائل" fill="#25D366" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* الرسم البياني الدائري لحالات الرسائل */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography variant="h6" gutterBottom>
              حالات الرسائل
            </Typography>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart width={400} height={300}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} رسائل`, null]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                height="100%"
              >
                <Typography color="text.secondary">
                  لا توجد بيانات لعرضها
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* إحصائيات إضافية للرسائل حسب الحالة في الأسبوع الماضي */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              حالات الرسائل للأسبوع الماضي
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                width={500}
                height={300}
                data={weeklyStatusData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ناجحة" stackId="a" fill="#25D366" />
                <Bar dataKey="فاشلة" stackId="a" fill="#ff4444" />
                <Bar dataKey="معلقة" stackId="a" fill="#ffbb33" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;