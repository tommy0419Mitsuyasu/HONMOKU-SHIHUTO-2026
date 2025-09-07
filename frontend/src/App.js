import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShiftRequestPage from './pages/ShiftRequestPage';
import ShiftManagementPage from './pages/ShiftManagementPage';
import MyShiftsCalendar from './pages/MyShiftsCalendar';
import AllShiftsCalendarPage from './pages/AllShiftsCalendarPage';
import jwt_decode from 'jwt-decode';
import './App.css';

const App = () => {
  const token = localStorage.getItem('token');
  let user = null;
  if (token) {
    try {
      user = jwt_decode(token);
    } catch (e) {
      console.error('Invalid token:', e);
      localStorage.removeItem('token'); // 無効なトークンは削除
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('ログアウトしました。');
    // useNavigateはコンポーネントのトップレベルでしか使えないため、window.locationでリダイレクト
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li>
              <Link to="/">ホーム</Link>
            </li>
            {token ? (
              <>
                <li>
                  <Link to="/request-shift">希望シフト提出</Link>
                </li>
                <li>
                  <Link to="/my-shifts">確定シフト確認</Link>
                </li>
                {user && user.user.role === 'admin' && (
                  <>
                    <li>
                      <Link to="/manage-shifts">シフト管理</Link>
                    </li>
                    <li>
                      <Link to="/all-shifts">全シフト確認</Link>
                    </li>
                  </>
                )}
                <li>
                  <button onClick={handleLogout}>ログアウト</button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">ログイン</Link>
                </li>
                <li>
                  <Link to="/register">登録</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/request-shift" element={<ShiftRequestPage />} />
            <Route path="/manage-shifts" element={<ShiftManagementPage />} />
            <Route path="/my-shifts" element={<MyShiftsCalendar />} />
            <Route path="/all-shifts" element={<AllShiftsCalendarPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
