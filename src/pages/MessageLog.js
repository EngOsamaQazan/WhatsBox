import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, TextField, 
  Select, MenuItem, FormControl, InputLabel, Grid, 
  Button, Chip, Divider, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, TablePagination 
} from '@mui/material';
import { useMessages } from '../context/MessageContext';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useNavigate } from 'react-router-dom';

function MessageLog() {
  const { state, dispatch } = useMessages();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // تطبيق الفلاتر على الرسائل
  useEffect(() => {
    let filtered = [...state.messages];
    
    // تطبيق فلتر البحث
    if (searchTerm) {
      filtered = filtered.filter(message => 
        message.phoneNumber.includes(searchTerm) || 
        (message.messageContent && message.messageContent.includes(searchTerm))
      );
    }
    
    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === statusFilter);
    }
    
    // تطبيق فلتر التاريخ
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(message => {
          const messageDate = new Date(message.timestamp);
          return messageDate >= today;
        });
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(message => {
          const messageDate = new Date(message.timestamp);
          return messageDate >= yesterday && messageDate < today;
        });
      } else if (dateFilter === 'last7days') {
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 7);
        filtered = filtered.filter(message => {
          const messageDate = new Date(message.timestamp);
          return messageDate >= last7days;
        });
      } else if (dateFilter === 'last30days') {
        const last30days = new Date(today);
        last30days.setDate(last30days.getDate() - 30);
        filtered = filtered.filter(message => {
          const messageDate = new Date(message.timestamp);
          return messageDate >= last30days;
        });
      }
    }
    
    setFilteredMessages(filtered);
  }, [state.messages, searchTerm, statusFilter, dateFilter]);
  
  // تصدير البيانات إلى ملف CSV
  const exportToCSV = () => {
    const headers = ['رقم الهاتف', 'الرسالة', 'الحالة', 'التاريخ والوقت', 'معرف الدفعة'];
    
    const csvData = filteredMessages.map(message => {
      return [
        message.phoneNumber,
        message.messageContent || '',
        message.status === 'success' ? 'ناجحة' : message.status === 'failed' ? 'فاشلة' : 'معلقة',
        new Date(message.timestamp).toLocaleString('ar-SA'),
        message.batchId
      ];
    });
    
    csvData.unshift(headers);
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `whatsapp_messages_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // حذف كل الرسائل
  const handleClearAll = () => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف جميع الرسائل؟')) {
      dispatch({ type: 'CLEAR_MESSAGES' });
    }
  };
  
  // تغيير الصفحة في الجدول
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // تغيير عدد الصفوف في كل صفحة
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // تنسيق التاريخ للعرض
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA');
  };
  
  // عرض رمز حالة الرسالة
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <HourglassEmptyIcon color="warning" />;
      default:
        return null;
    }
  };
  
  // إعادة توجيه المستخدم إلى صفحة التقدم للدفعة المحددة
  const viewBatchProgress = (batchId) => {
    navigate(`/progress/${batchId}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          سجل الرسائل
        </Typography>
        <Typography color="text.secondary" paragraph>
          عرض وتصفية وتصدير سجل الرسائل المرسلة
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* شريط البحث والفلاتر */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="بحث عن رقم هاتف أو محتوى"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="primary" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Box display="flex">
              <Button 
                variant="outlined" 
                startIcon={<FilterListIcon />} 
                onClick={() => setShowFilters(!showFilters)}
                sx={{ mr: 2 }}
              >
                {showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                sx={{ mr: 2 }}
              >
                تصدير CSV
              </Button>
              
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearAll}
              >
                حذف الكل
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            {showFilters && (
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>حالة الرسالة</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="حالة الرسالة"
                      >
                        <MenuItem value="all">جميع الحالات</MenuItem>
                        <MenuItem value="success">ناجحة</MenuItem>
                        <MenuItem value="failed">فاشلة</MenuItem>
                        <MenuItem value="pending">معلقة</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>الفترة الزمنية</InputLabel>
                      <Select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        label="الفترة الزمنية"
                      >
                        <MenuItem value="all">كل الفترات</MenuItem>
                        <MenuItem value="today">اليوم</MenuItem>
                        <MenuItem value="yesterday">أمس</MenuItem>
                        <MenuItem value="last7days">آخر 7 أيام</MenuItem>
                        <MenuItem value="last30days">آخر 30 يوم</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* إحصائيات الفلترة */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            تم العثور على {filteredMessages.length} رسالة
          </Typography>
          
          {searchTerm && (
            <Chip 
              label={`بحث: ${searchTerm}`} 
              onDelete={() => setSearchTerm('')}
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          
          {statusFilter !== 'all' && (
            <Chip 
              label={`الحالة: ${
                statusFilter === 'success' ? 'ناجحة' : 
                statusFilter === 'failed' ? 'فاشلة' : 'معلقة'
              }`} 
              onDelete={() => setStatusFilter('all')}
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          
          {dateFilter !== 'all' && (
            <Chip 
              label={`الفترة: ${
                dateFilter === 'today' ? 'اليوم' : 
                dateFilter === 'yesterday' ? 'أمس' : 
                dateFilter === 'last7days' ? 'آخر 7 أيام' : 'آخر 30 يوم'
              }`} 
              onDelete={() => setDateFilter('all')}
              size="small"
            />
          )}
        </Box>
        
        {/* جدول الرسائل */}
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>الرقم</TableCell>
                <TableCell>التاريخ والوقت</TableCell>
                <TableCell>الرسالة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>معرف الدفعة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMessages.length > 0 ? (
                filteredMessages
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((message, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{message.phoneNumber}</TableCell>
                      <TableCell>{formatDate(message.timestamp)}</TableCell>
                      <TableCell 
                        sx={{ 
                          maxWidth: 250, 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {message.messageContent || 'بدون محتوى'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getStatusIcon(message.status)}
                          <Typography sx={{ mr: 1 }}>
                            {message.status === 'success' ? 'ناجحة' : 
                             message.status === 'failed' ? 'فاشلة' : 'معلقة'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => viewBatchProgress(message.batchId)}
                        >
                          {message.batchId.substring(0, 8)}...
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography sx={{ py: 3 }}>
                      لا توجد رسائل للعرض
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* ترقيم الصفحات */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredMessages.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </Paper>
    </Container>
  );
}

export default MessageLog;