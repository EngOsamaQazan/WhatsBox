import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { MessageProvider } from './context/MessageContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import SendMessages from './pages/SendMessages';
import MessageLog from './pages/MessageLog';
import ProgressPage from './pages/ProgressPage';
import Settings from './pages/Settings';
import ConnectedPhones from './pages/ConnectedPhones';
import './App.css';

function App() {
  return (
    <MessageProvider>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/send" element={<SendMessages />} />
            <Route path="/progress/:batchId" element={<ProgressPage />} />
            <Route path="/log" element={<MessageLog />} />
            <Route path="/phones" element={<ConnectedPhones />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </MessageProvider>
  );
}

export default App;