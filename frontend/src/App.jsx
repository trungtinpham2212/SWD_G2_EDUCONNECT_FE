import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createRoutes } from './routers/router';
import SessionDetail from './pages/Teacher/SessionDetail';

function App() {
  const [active, setActive] = useState("Trang chủ");
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading

  // Load user from localStorage when app starts
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.token && parsedUser.userName && parsedUser.roleId) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false); // Đánh dấu là đã kiểm tra xong user
  }, []);

  const handleSetUser = (userData) => {
    if (userData) {
      setUser(userData);
      setActive("Trang chủ");
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      setUser(null);
      setActive("Trang chủ");
      localStorage.removeItem('user');
    }
  };

  const routes = createRoutes({
    user,
    active,
    setActive,
    isSidebarOpen,
    setSidebarOpen,
    handleSetUser
  });

  // Không render route cho đến khi xác định xong user
  if (loading) {
    return <div className="p-6 text-center">Đang tải...</div>;
  }

  return (
    <Router>
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
        <Route path="/session/:sessionid" element={<SessionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
