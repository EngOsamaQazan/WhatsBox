import React from 'react';
import { 
  Box, Typography, FormControl, FormLabel, RadioGroup, 
  FormControlLabel, Radio, Divider, Button, Chip
} from '@mui/material';
import { useMessages } from '../context/MessageContext';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';
import KeyIcon from '@mui/icons-material/Key';
import { Link } from 'react-router-dom';

function PhoneSelector({ selectedValue, onChange }) {
  const { state } = useMessages();
  const { connectedPhones, selectedPhone } = state;
  
  // فلترة الأرقام النشطة فقط
  const activePhones = connectedPhones ? connectedPhones.filter(phone => phone.status === 'active') : [];
  
  // فصل الأرقام حسب نوع الاتصال
  const qrPhones = activePhones.filter(phone => phone.connection_type === 'qr');
  const apiPhones = activePhones.filter(phone => phone.connection_type === 'api');
  
  // الرقم الافتراضي (العادي)
  const defaultApiOption = 'default_api';
  
  // معالجة تغيير الاختيار
  const handleChange = (event) => {
    const value = event.target.value;
    
    // إذا كان الاختيار هو الرقم الافتراضي
    if (value === defaultApiOption) {
      onChange({
        type: 'api',
        id: null
      });
    } else {
      // البحث عن الرقم في قائمة الأرقام المتصلة
      const phone = connectedPhones.find(p => p.id === value);
      
      if (phone) {
        onChange({
          type: phone.connection_type,
          id: phone.id,
          phone: phone
        });
      }
    }
  };

  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend">طريقة الإرسال</FormLabel>
      
      <RadioGroup
        value={selectedValue || defaultApiOption}
        onChange={handleChange}
      >
        {/* خيار الإرسال العادي عبر API */}
        <FormControlLabel 
          value={defaultApiOption}
          control={<Radio color="primary" />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography>
                إرسال عبر WhatsBox API (الطريقة العادية)
              </Typography>
            </Box>
          }
        />
        
        {/* خيارات الأرقام المتصلة عبر QR */}
        {qrPhones.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
              أرقام متصلة عبر QR
            </Typography>
            
            {qrPhones.map(phone => (
              <FormControlLabel
                key={phone.id}
                value={phone.id}
                control={<Radio color="success" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WhatsAppIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography>
                      {phone.phone_name || phone.phone_number}
                    </Typography>
                    <Chip
                      size="small"
                      label="متصل"
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
              />
            ))}
          </>
        )}
        
        {/* خيارات الأرقام المتصلة عبر API */}
        {apiPhones.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
              أرقام متصلة عبر API
            </Typography>
            
            {apiPhones.map(phone => (
              <FormControlLabel
                key={phone.id}
                value={phone.id}
                control={<Radio color="primary" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>
                      {phone.phone_name || phone.phone_number}
                    </Typography>
                    <Chip
                      size="small"
                      label="متصل"
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
              />
            ))}
          </>
        )}
      </RadioGroup>
      
      {/* رابط لإضافة رقم جديد */}
      {(connectedPhones === undefined || connectedPhones.length === 0) && (
        <Box sx={{ mt: 2 }}>
          <Button 
            component={Link} 
            to="/phones" 
            variant="outlined" 
            color="primary"
            size="small"
            startIcon={<WhatsAppIcon />}
          >
            إضافة رقم واتساب
          </Button>
        </Box>
      )}
    </FormControl>
  );
}

export default PhoneSelector;