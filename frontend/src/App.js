import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShiftRequestPage from './pages/ShiftRequestPage';
import ShiftManagementPage from './pages/ShiftManagementPage';
import MyShiftsCalendar from './pages/MyShiftsCalendar';
import AllShiftsCalendarPage from './pages/AllShiftsCalendarPage';
import ShiftBoardPage from './pages/ShiftBoardPage';
import MemberManagementPage from './pages/MemberManagementPage'; // 追加
import AdminRoute from './components/AdminRoute'; // 追加
import { CssBaseline } from '@mui/material';

const App = () => {
  return (
    <Router>
      <CssBaseline /> {/* MUIの基本的なスタイルを適用 */}
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Staff Routes */}
          <Route path="/request-shift" element={<ShiftRequestPage />} />
          <Route path="/my-shifts" element={<MyShiftsCalendar />} />

          {/* Admin Routes */}
          <Route path="/manage-shifts" element={<AdminRoute><ShiftManagementPage /></AdminRoute>} />
          <Route path="/all-shifts" element={<AdminRoute><AllShiftsCalendarPage /></AdminRoute>} />
          <Route path="/shift-board" element={<AdminRoute><ShiftBoardPage /></AdminRoute>} />
          <Route path="/member-management" element={<AdminRoute><MemberManagementPage /></AdminRoute>} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
