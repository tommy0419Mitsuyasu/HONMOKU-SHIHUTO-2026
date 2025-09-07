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
          <Route path="/request-shift" element={<ShiftRequestPage />} />
          <Route path="/manage-shifts" element={<ShiftManagementPage />} />
          <Route path="/my-shifts" element={<MyShiftsCalendar />} />
          <Route path="/all-shifts" element={<AllShiftsCalendarPage />} />
          <Route path="/shift-board" element={<ShiftBoardPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
